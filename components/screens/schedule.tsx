import React, { useState, useEffect, useCallback } from 'react';
import { COLORS } from '../../constants/colors';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Users, FileText, CheckCircle, XCircle, Info, RefreshCw, Lock } from 'lucide-react-native';

// --- Types ---
interface TeeSlot {
    slot_time: string; // ISO String
    booked_count: number;
    is_user_booked: boolean;
    user_booking_status: 'pending' | 'confirmed' | 'rejected' | 'proposed' | 'withdrawn' | 'cancelled' | null;
    user_booking_id: string | null;
    user_admin_note?: string;
    user_proposed_time?: string;
}

interface DayLoad {
    date: string; // YYYY-MM-DD
    total_players: number;
    status: 'low' | 'medium' | 'high' | 'closed';
}

// --- Configuration ---
const MAX_PLAYERS_PER_SLOT = 4;
// Heuristic capacity for colors: < 20 (Green), 20-50 (Yellow), > 50 (Red)
const LOAD_THRESHOLDS = { LOW: 20, MEDIUM: 50 };
const COURSE_OPEN_HOUR = 6;  // 6:00 AM
const COURSE_CLOSE_HOUR = 18; // 6:00 PM

const ScheduleScreen: React.FC = () => {
    // State
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [monthlyLoad, setMonthlyLoad] = useState<Record<string, any>>({});
    const [slots, setSlots] = useState<TeeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TeeSlot | null>(null);
    const [flightSize, setFlightSize] = useState(1);
    const [durationHours, setDurationHours] = useState(4);
    const [bookingNote, setBookingNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Club/Venue Selection
    const [clubs, setClubs] = useState<any[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

    // Load Initial Data
    useEffect(() => {
        fetchMonthlyLoad(selectedDate);
        fetchClubs();
    }, []);

    const fetchClubs = async () => {
        const { data } = await supabase.from('clubs').select('id, name');
        if (data) {
            setClubs(data);
            if (data.length > 0) setSelectedClubId(data[0].id); // Default to first club
        }
    };

    // Load Slots when date changes
    useEffect(() => {
        fetchSlots(selectedDate);
    }, [selectedDate]);

    // --- Data Fetching ---

    const fetchMonthlyLoad = async (dateStr: string) => {
        const startOfMonth = new Date(dateStr);
        startOfMonth.setDate(1); // 1st of month
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0); // Last day

        const { data, error } = await supabase.rpc('get_monthly_load', {
            start_date: startOfMonth.toISOString(),
            end_date: endOfMonth.toISOString(),
        });

        if (error) {
            console.error('Error fetching load:', error);
            return;
        }

        // Process Marks
        const newMarks: Record<string, any> = {};
        data.forEach((day: any) => {
            const d = day.day.split('T')[0];
            const count = day.total_players;

            let color = COLORS.success; // Green
            if (count > LOAD_THRESHOLDS.MEDIUM) color = COLORS.error; // Red
            else if (count > LOAD_THRESHOLDS.LOW) color = COLORS.warning; // Yellow

            // Assume if very high it's fully booked or closed (logic can be refined)

            newMarks[d] = {
                marked: true,
                dotColor: color
            };
        });

        // --- Fetch User's Personal Bookings for this Month ---
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: myBookings } = await supabase
                    .from('bookings')
                    .select('start_time, status')
                    .eq('user_id', user.id)
                    .gte('start_time', startOfMonth.toISOString())
                    .lte('start_time', endOfMonth.toISOString())
                    .in('status', ['confirmed', 'pending']);

                if (myBookings) {
                    myBookings.forEach((b: any) => {
                        const d = b.start_time.split('T')[0];
                        // If confirmed, use Primary (Blue). If pending, use Warning (Yellow) or keep load color?
                        // Let's prioritize Confirmed as a Blue dot.
                        if (b.status === 'confirmed') {
                            newMarks[d] = {
                                marked: true,
                                dotColor: COLORS.primary
                            };
                        }
                    });
                }
            }
        } catch (err) {
            console.log("Error fetching my bookings for calendar", err);
        }

        // Add selected indicator
        const currentMark = newMarks[selectedDate] || {};
        newMarks[selectedDate] = { ...currentMark, selected: true, selectedColor: COLORS.primary };

        setMonthlyLoad(newMarks);
    };

    const fetchSlots = async (dateStr: string) => {
        setLoadingSlots(true);

        // 1. Generate Base Slots (Using Configured Hours)
        const baseSlots: TeeSlot[] = [];
        const startHour = COURSE_OPEN_HOUR;
        const endHour = COURSE_CLOSE_HOUR; // 5 PM
        const dateObj = new Date(dateStr);

        for (let h = startHour; h < endHour; h++) {
            ['00', '15', '30', '45'].forEach(min => {
                // Construct ISO string for this slot
                const d = new Date(dateObj);
                d.setHours(h);
                d.setMinutes(parseInt(min));
                d.setSeconds(0);
                d.setMilliseconds(0);

                baseSlots.push({
                    slot_time: d.toISOString(),
                    booked_count: 0,
                    is_user_booked: false,
                    user_booking_status: null,
                    user_booking_id: null
                });
            });
        }

        // 2. Fetch Bookings from Supabase
        const startDt = new Date(dateStr);
        startDt.setHours(0, 0, 0, 0);
        const endDt = new Date(dateStr);
        endDt.setHours(23, 59, 59, 999);

        let { data, error } = await supabase.rpc('get_tee_sheet_range', {
            start_dt: startDt.toISOString(),
            end_dt: endDt.toISOString()
        });

        // Fallback for PGRST202 (Function not found) if user hasn't run the SQL migration yet
        if (error && error.code === 'PGRST202') {
            console.warn("get_tee_sheet_range not found, falling back to get_tee_sheet");
            const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_tee_sheet', {
                target_date: dateStr
            });
            data = fallbackData;
            error = fallbackError;
        }

        if (error) {
            console.error('Error fetching slots:', error);
            // Default to empty slots if error, don't crash
            setSlots(baseSlots);
        } else {
            // 3. Merge Bookings into Base Slots
            // We use a map for O(1) lookup
            const bookingsMap = new Map<string, TeeSlot>();
            if (data) {
                data.forEach((b: any) => {
                    // Normalize the time string to compare
                    const t = new Date(b.slot_time).toISOString();
                    bookingsMap.set(t, b);
                });
            }

            const mergedSlots = baseSlots.map(slot => {
                const booking = bookingsMap.get(slot.slot_time);
                return booking ? booking : slot;
            });

            setSlots(mergedSlots);
        }
        setLoadingSlots(false);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        Promise.all([fetchMonthlyLoad(selectedDate), fetchSlots(selectedDate)])
            .finally(() => setRefreshing(false));
    };

    // --- Actions ---

    const openBookingModal = (slot: TeeSlot) => {
        // Prevent booking passing time
        const slotTime = new Date(slot.slot_time);
        const now = new Date();
        if (slotTime < now) {
            Alert.alert("Invalid Time", "You cannot schedule a game in the past.");
            return;
        }

        if (slot.is_user_booked) {
            // If proposed, maybe show acceptance logic? For this iteration just alert.
            Alert.alert('Booking Status', `Status: ${slot.user_booking_status?.toUpperCase()}`);
            return;
        }

        setSelectedSlot(slot); // CRITICAL: Set slot before opening modal
        if (clubs.length > 0) setSelectedClubId(clubs[0].id); // Reset to default
        setFlightSize(1);
        setDurationHours(4); // Default standard round
        setBookingNote('');
        setModalVisible(true);
    };

    const submitBooking = async () => {
        // Debug Alert - remove later
        // Alert.alert("Debug", "Submit process started"); 

        console.log("Submit booking initiated");
        if (!selectedSlot) {
            Alert.alert("Error", "No time slot selected.");
            return;
        }

        // Only require club selection if clubs are actually available to select
        if (clubs.length > 0 && !selectedClubId) {
            console.log("Validation failed: Club required but missing");
            Alert.alert("Venue Required", "Please select a club/venue.");
            return;
        }

        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Calculate End Time
            const endTime = new Date(selectedSlot.slot_time);
            endTime.setHours(endTime.getHours() + durationHours);

            const payload = {
                user_id: user.id,
                club_id: selectedClubId || null,
                start_time: selectedSlot.slot_time,
                end_time: endTime.toISOString(),
                player_count: flightSize,
                user_note: bookingNote,
                status: 'pending'
            };

            console.log("Sending booking payload:", JSON.stringify(payload));

            const { error } = await supabase
                .from('bookings')
                .insert(payload);

            if (error) {
                console.error("Supabase Booking Error:", error);
                throw error;
            }

            console.log("Booking submission effective.");
            Alert.alert('Request Sent', 'Your booking request is pending admin approval.');
            setModalVisible(false);
            fetchSlots(selectedDate); // Refresh
            fetchMonthlyLoad(selectedDate); // Refresh dots
        } catch (err: any) {
            console.error("Booking Exception:", err);
            Alert.alert('Booking Failed', err.message || "Unknown error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Renderers ---

    const renderSlot = ({ item }: { item: TeeSlot }) => {
        const timeLabel = format(new Date(item.slot_time), 'h:mm a');
        const availableSpots = MAX_PLAYERS_PER_SLOT - item.booked_count;
        const isFull = availableSpots <= 0;

        // Status Colors/Badges
        let statusBadge = null;
        let statusStyle = {};
        let adminMessage = null;

        if (item.user_booking_status === 'pending') {
            statusBadge = <View style={[styles.badge, { backgroundColor: COLORS.warning }]}><Text style={styles.badgeText}>Pending</Text></View>;
            statusStyle = styles.slotCardPending;
        } else if (item.user_booking_status === 'confirmed') {
            statusBadge = <View style={[styles.badge, { backgroundColor: COLORS.success }]}><Text style={styles.badgeText}>Confirmed</Text></View>;
            statusStyle = styles.slotCardConfirmed;
        } else if (item.user_booking_status === 'rejected') {
            statusBadge = <View style={[styles.badge, { backgroundColor: COLORS.error }]}><Text style={styles.badgeText}>Rejected</Text></View>;
            statusStyle = styles.slotCardRejected;
            if (item.user_admin_note) {
                adminMessage = (
                    <View style={styles.adminMessageContainer}>
                        <Info size={14} color={COLORS.error} style={{ marginRight: 4 }} />
                        <Text style={styles.adminMessageText}>Admin: {item.user_admin_note}</Text>
                    </View>
                );
            }
        } else if (item.user_booking_status === 'proposed') {
            const proposedTime = item.user_proposed_time ? format(new Date(item.user_proposed_time), 'h:mm a') : 'New Time';
            statusBadge = <View style={[styles.badge, { backgroundColor: COLORS.info }]}><Text style={styles.badgeText}>{proposedTime}?</Text></View>;
            statusStyle = styles.slotCardProposed;
            adminMessage = (
                <View style={styles.adminMessageContainer}>
                    <RefreshCw size={14} color={COLORS.info} style={{ marginRight: 4 }} />
                    <Text style={[styles.adminMessageText, { color: COLORS.info }]}>
                        Admin proposed change to {proposedTime}
                    </Text>
                    {/* Add Accept/Decline buttons here in V2 */}
                </View>
            );
        }

        return (
            <TouchableOpacity
                style={[styles.slotCard, styles.slotCardBase, statusStyle]}
                onPress={() => openBookingModal(item)}
                disabled={(isFull && !item.is_user_booked) || item.user_booking_status === 'rejected'}
            >
                <View style={styles.slotMainRow}>
                    {/* Left: Time & Status */}
                    <View style={styles.slotTimeContainer}>
                        <Text style={styles.slotTime}>{timeLabel}</Text>
                        {statusBadge}
                        {!isFull && item.booked_count > 0 && (
                            <Text style={styles.spotsLeftText}>
                                {availableSpots} spot{availableSpots !== 1 ? 's' : ''} left
                            </Text>
                        )}
                    </View>

                    {/* Right: Visualization */}
                    <View style={styles.slotVisuals}>
                        {/* Render Avatars/Circles */}
                        <View style={styles.avatarRow}>
                            {/* Occupied Spots */}
                            {Array.from({ length: item.booked_count }).map((_, i) => (
                                <View key={`b-${i}`} style={[styles.playerObj, styles.playerBooked]}>
                                    <Users size={12} color="#fff" />
                                </View>
                            ))}
                            {/* Booked by ME specifically (visual highlight usually, but here handled by generic booked count for privacy, or separate if we want) */}

                            {/* Empty Spots */}
                            {Array.from({ length: Math.max(0, MAX_PLAYERS_PER_SLOT - item.booked_count) }).map((_, i) => (
                                <View key={`e-${i}`} style={[styles.playerObj, styles.playerEmpty]} />
                            ))}
                        </View>

                        {isFull && !item.is_user_booked && (
                            <Text style={styles.fullText}>FULL</Text>
                        )}
                    </View>
                </View>

                {/* Admin Message Bubble */}
                {adminMessage}

                {/* Lock Icon for Full */}
                {isFull && !item.is_user_booked && (
                    <View style={styles.lockOverlay}>
                        <Lock size={16} color="#999" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* 1. Master Calendar View */}
            <View style={styles.calendarContainer}>
                <Calendar
                    current={selectedDate}
                    onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                    markedDates={{
                        ...monthlyLoad,
                        [selectedDate]: {
                            selected: true,
                            selectedColor: COLORS.primary,
                            ...(monthlyLoad[selectedDate] || {})
                        }
                    }}
                    theme={{
                        backgroundColor: '#ffffff',
                        calendarBackground: '#ffffff',
                        textSectionTitleColor: '#b6c1cd',
                        selectedDayBackgroundColor: COLORS.primary,
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: COLORS.primary,
                        dayTextColor: '#2d4150',
                        arrowColor: COLORS.primary,
                        monthTextColor: COLORS.dark,
                        textDayFontWeight: '600',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '300',
                        textDayFontSize: 16,
                    }}
                />

                {/* Legend */}
                <View style={styles.legendRow}>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.success }]} /><Text style={styles.legendText}>High Availability</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} /><Text style={styles.legendText}>Busy</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.error }]} /><Text style={styles.legendText}>Full</Text></View>
                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>My Game</Text></View>
                </View>
            </View>

            {/* 2. Tee Sheet View */}
            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <View>
                        <Text style={styles.listTitle}>Available Times</Text>
                        <Text style={styles.spotsLeftText}>
                            Today's Tee Sheet: {COURSE_OPEN_HOUR}:00 AM - {COURSE_CLOSE_HOUR > 12 ? COURSE_CLOSE_HOUR - 12 : COURSE_CLOSE_HOUR}:00 PM
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleRefresh}>
                        <RefreshCw size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {loadingSlots ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={slots}
                        renderItem={renderSlot}
                        keyExtractor={item => item.slot_time}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={<Text style={styles.emptyText}>No tee times available for this date.</Text>}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )}
            </View>

            {/* 3. Booking Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request to Join</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <XCircle size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            {selectedSlot && format(new Date(selectedSlot.slot_time), 'EEEE, MMMM d • h:mm a')}
                        </Text>

                        <Text style={styles.modalSubtitle}>
                            {selectedSlot && format(new Date(selectedSlot.slot_time), 'EEEE, MMMM d • h:mm a')}
                        </Text>

                        {/* Field 0: Club Selection */}
                        <Text style={styles.inputLabel}>Select Venue</Text>
                        <View style={{ marginBottom: 20 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {clubs.map(club => (
                                    <TouchableOpacity
                                        key={club.id}
                                        style={[
                                            styles.flightOption,
                                            { width: 'auto', paddingHorizontal: 16 },
                                            selectedClubId === club.id && styles.flightOptionSelected
                                        ]}
                                        onPress={() => setSelectedClubId(club.id)}
                                    >
                                        <Text style={[
                                            styles.flightOptionText,
                                            { fontSize: 14 },
                                            selectedClubId === club.id && styles.flightOptionTextSelected
                                        ]}>
                                            {club.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Field 1: Flight Selection */}
                        <Text style={styles.inputLabel}>Flight Size (Players)</Text>
                        <View style={styles.flightSelector}>
                            {[1, 2, 3, 4].map(num => (
                                <TouchableOpacity
                                    key={num}
                                    style={[styles.flightOption, flightSize === num && styles.flightOptionSelected]}
                                    onPress={() => setFlightSize(num)}
                                >
                                    <Text style={[styles.flightOptionText, flightSize === num && styles.flightOptionTextSelected]}>{num}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Field 2: Duration / End Time */}
                        <Text style={styles.inputLabel}>Estimated Duration (Hours)</Text>
                        <View style={styles.flightSelector}>
                            {[2, 3, 4, 5].map(hrs => (
                                <TouchableOpacity
                                    key={hrs}
                                    style={[styles.flightOption, durationHours === hrs && styles.flightOptionSelected, { width: 60 }]}
                                    onPress={() => setDurationHours(hrs)}
                                >
                                    <Text style={[styles.flightOptionText, durationHours === hrs && styles.flightOptionTextSelected]}>{hrs}h</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {selectedSlot && (
                            <Text style={{ marginBottom: 20, color: COLORS.textLight, fontSize: 13, fontStyle: 'italic', marginTop: -15 }}>
                                Ends at: {format(new Date(new Date(selectedSlot.slot_time).getTime() + durationHours * 60 * 60 * 1000), 'h:mm a')}
                            </Text>
                        )}

                        {/* Field 2: Note */}
                        <Text style={styles.inputLabel}>Note for Admin (Optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Example: Need a cart, bringing a guest..."
                            placeholderTextColor="#999"
                            multiline
                            maxLength={140}
                            value={bookingNote}
                            onChangeText={setBookingNote}
                        />
                        <Text style={styles.charCount}>{bookingNote.length}/140</Text>

                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={submitBooking}
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Send Request</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    calendarContainer: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        zIndex: 10,
        paddingBottom: 10,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#666',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    listContent: {
        paddingBottom: 40,
    },
    slotCard: {
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderRadius: 16,
    },
    slotCardBase: {
        paddingVertical: 18,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },
    slotCardPending: {
        backgroundColor: '#FFF8E1',
        borderWidth: 1,
        borderColor: '#FFC107', // COLORS.warning
    },
    slotCardConfirmed: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#4CAF50', // COLORS.success
    },
    slotCardRejected: {
        backgroundColor: '#FFEBEE',
        borderWidth: 1,
        borderColor: '#FF6B6B', // COLORS.error
        opacity: 0.8,
    },
    slotCardProposed: {
        backgroundColor: '#E3F2FD',
        borderWidth: 1,
        borderColor: '#2196F3', // COLORS.info
    },
    slotCardActive: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: '#F0F9FF',
    },
    slotMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    adminMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    adminMessageText: {
        fontSize: 12,
        color: '#FF6B6B', // COLORS.error
        fontStyle: 'italic',
        flex: 1,
    },
    slotTimeContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    slotTime: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    slotVisuals: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playerObj: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginLeft: -8,
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playerBooked: {
        backgroundColor: COLORS.secondary,
        zIndex: 2,
    },
    playerEmpty: {
        backgroundColor: '#F0F0F0',
        zIndex: 1,
    },
    fullText: {
        marginLeft: 10,
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.error,
    },
    lockOverlay: {
        position: 'absolute',
        right: 20,
        top: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
        fontSize: 14,
    },
    spotsLeftText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
        fontWeight: '500',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 25,
        paddingBottom: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    modalSubtitle: {
        fontSize: 16,
        color: COLORS.primary,
        marginBottom: 25,
        fontWeight: '500',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textLight,
        marginBottom: 10,
    },
    flightSelector: {
        flexDirection: 'row',
        marginBottom: 25,
    },
    flightOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    flightOptionSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    flightOptionText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    flightOptionTextSelected: {
        color: '#fff',
    },
    textInput: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 15,
        height: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#EEE',
        fontSize: 16,
        color: COLORS.text,
    },
    charCount: {
        textAlign: 'right',
        fontSize: 12,
        color: '#ccc',
        marginTop: 5,
        marginBottom: 25,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 15,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ScheduleScreen;
