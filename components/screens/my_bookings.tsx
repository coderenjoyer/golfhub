import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, ChevronLeft, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';

const MyBookingsScreen = () => {
    const navigation = useNavigation();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('user_id', user.id)
                .order('start_time', { ascending: true });

            if (error) throw error;
            setBookings(data || []);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        let statusColor = COLORS.warning;
        let statusText = item.status;

        if (item.status === 'confirmed') statusColor = COLORS.success;
        else if (item.status === 'rejected') statusColor = COLORS.error;
        else if (item.status === 'proposed') statusColor = COLORS.info;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.dateContainer}>
                        <Calendar size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.dateText}>
                            {format(new Date(item.start_time), 'EEEE, MMMM d, yyyy')}
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColor }]}>
                        <Text style={styles.badgeText}>{statusText.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.detailRow}>
                        <Clock size={16} color={COLORS.textLight} />
                        <Text style={styles.detailText}>
                            {format(new Date(item.start_time), 'h:mm a')}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MapPin size={16} color={COLORS.textLight} />
                        <Text style={styles.detailText}>
                            Flight of {item.player_count}
                        </Text>
                    </View>
                </View>

                {(item.admin_note || item.status === 'proposed') && (
                    <View style={styles.adminNoteBox}>
                        <Text style={styles.adminNoteLabel}>Admin Note:</Text>
                        <Text style={styles.adminNoteText}>
                            {item.admin_note || (item.status === 'proposed' ? `Proposed new time: ${format(new Date(item.proposed_time!), 'h:mm a')}` : '')}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={COLORS.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Schedule</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={bookings}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Calendar size={48} color="#ddd" />
                            <Text style={styles.emptyText}>No bookings found.</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={fetchBookings}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    listContent: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardBody: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        color: COLORS.textLight,
        fontSize: 14,
    },
    adminNoteBox: {
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 8,
        marginTop: 8,
    },
    adminNoteLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 2,
    },
    adminNoteText: {
        fontSize: 13,
        color: '#333',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
    },
});

export default MyBookingsScreen;
