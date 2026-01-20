import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/colors';
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert,
} from 'react-native';

// Interfaces for our Mock Data
interface DateItem {
    id: string;
    dayName: string; // Mon, Tue
    dayNumber: string; // 12, 13
    fullDate: string; // For comparison
    status: 'open' | 'busy' | 'full' | 'closed';
}

interface TeeTime {
    id: string;
    time: string;
    players: string[]; // List of avatar URLs
    maxPlayers: number;
    userStatus: 'none' | 'pending' | 'booked';
}

const { width } = Dimensions.get('window');

// Mock Data Generators
const generateNext14Days = (): DateItem[] => {
    const days: DateItem[] = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        // Random status generation
        const rand = Math.random();
        let status: DateItem['status'] = 'open';
        if (rand > 0.8) status = 'closed';
        else if (rand > 0.6) status = 'full';
        else if (rand > 0.4) status = 'busy';

        days.push({
            id: i.toString(),
            dayName: dayNames[d.getDay()],
            dayNumber: d.getDate().toString(),
            fullDate: d.toDateString(),
            status: status
        });
    }
    return days;
};

const generateTeeTimes = (dateStatus: string): TeeTime[] => {
    if (dateStatus === 'closed') return [];

    const times: TeeTime[] = [];
    const startHour = 6; // 6 AM
    const endHour = 16; // 4 PM

    for (let h = startHour; h <= endHour; h++) {
        // Create 15 min slots: 00, 15, 30, 45
        ['00', '15', '30', '45'].forEach(minute => {
            // Mock players
            const playerCount = Math.floor(Math.random() * 5); // 0 to 4
            const players = [];
            for (let p = 0; p < playerCount; p++) {
                players.push(`https://i.pravatar.cc/100?u=${h}${minute}${p}`);
            }

            times.push({
                id: `${h}-${minute}`,
                time: `${h > 12 ? h - 12 : h}:${minute} ${h >= 12 ? 'PM' : 'AM'}`,
                players: players,
                maxPlayers: 4,
                userStatus: 'none',
            });
        });
    }
    return times;
};

const ScheduleScreen: React.FC = () => {
    const [dates, setDates] = useState<DateItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<DateItem | null>(null);
    const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);

    useEffect(() => {
        const generatedDates = generateNext14Days();
        setDates(generatedDates);
        setSelectedDate(generatedDates[0]); // Select today by default
    }, []);

    useEffect(() => {
        if (selectedDate) {
            setTeeTimes(generateTeeTimes(selectedDate.status));
        }
    }, [selectedDate]);

    const handleSlotPress = (item: TeeTime) => {
        if (item.userStatus === 'pending') {
            Alert.alert("Request Pending", "You have already requested to join this flight.");
            return;
        }

        Alert.alert(
            "Request to Join",
            `Request to join the ${item.time} flight?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Send Request", onPress: () => confirmJoinRequest(item.id) }
            ]
        );
    };

    const confirmJoinRequest = (slotId: string) => {
        setTeeTimes(prevTimes => prevTimes.map(time => {
            if (time.id === slotId) {
                return { ...time, userStatus: 'pending' };
            }
            return time;
        }));
    };

    const getStatusColor = (status: string, isSelected: boolean) => {
        if (isSelected) return COLORS.primary; // Selected Highlight
        switch (status) {
            case 'open': return '#4CAF50'; // Green
            case 'busy': return '#FFC107'; // Yellow
            case 'full': return '#F44336'; // Red
            default: return '#9E9E9E'; // Grey (Closed)
        }
    };

    const renderDateItem = ({ item }: { item: DateItem }) => {
        const isSelected = selectedDate?.id === item.id;
        const statusColor = getStatusColor(item.status, isSelected);

        return (
            <TouchableOpacity
                style={[
                    styles.dateItem,
                    isSelected && styles.dateItemSelected,
                    { borderColor: statusColor }
                ]}
                onPress={() => setSelectedDate(item)}
            >
                <Text style={[styles.dayName, isSelected && styles.textSelected]}>{item.dayName}</Text>
                <Text style={[styles.dayNumber, isSelected && styles.textSelected]}>{item.dayNumber}</Text>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </TouchableOpacity>
        );
    };

    const renderTeeTimeItem = ({ item }: { item: TeeTime }) => {
        const isFull = item.players.length >= item.maxPlayers;
        const isPending = item.userStatus === 'pending';

        return (
            <TouchableOpacity
                style={[styles.slotCard, isPending && styles.slotCardPending]}
                disabled={isFull && !isPending}
                onPress={() => handleSlotPress(item)}
            >
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{item.time}</Text>
                    {isPending ? (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>Pending</Text>
                        </View>
                    ) : isFull ? (
                        <Text style={styles.fullBadge}>FULL</Text>
                    ) : (
                        <Text style={styles.openBadge}>{item.maxPlayers - item.players.length} spots</Text>
                    )}
                </View>

                <View style={styles.playersContainer}>
                    {item.players.map((url, index) => (
                        <Image key={index} source={{ uri: url }} style={styles.avatar} />
                    ))}
                    {/* Empty slots placeholders */}
                    {[...Array(item.maxPlayers - item.players.length)].map((_, i) => (
                        <View key={`empty-${i}`} style={styles.emptyAvatar} />
                    ))}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Book a Tee Time</Text>
            </View>

            {/* Calendar Strip (Top Half) */}
            <View style={styles.calendarContainer}>
                <FlatList
                    data={dates}
                    renderItem={renderDateItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.calendarContent}
                />
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} /><Text style={styles.legendText}>Available</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} /><Text style={styles.legendText}>Busy</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#F44336' }]} /><Text style={styles.legendText}>Full</Text></View>
            </View>

            {/* Time Slots (Bottom Half) */}
            <FlatList
                data={teeTimes}
                renderItem={renderTeeTimeItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            {selectedDate?.status === 'closed' ? "Course Closed" : "No tee times available for this date."}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    calendarContainer: {
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    calendarContent: {
        paddingHorizontal: 16,
    },
    dateItem: {
        width: 60,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#fff',
    },
    dateItemSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dayName: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    dayNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    textSelected: {
        color: '#fff',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: '#f0f0f0',
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
        marginRight: 4,
    },
    legendText: {
        fontSize: 10,
        color: '#666',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    slotCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    timeContainer: {
        justifyContent: 'center',
    },
    timeText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    openBadge: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },
    fullBadge: {
        fontSize: 12,
        color: COLORS.error,
        fontWeight: 'bold',
    },
    playersContainer: {
        flexDirection: 'row',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginLeft: -10,
        borderWidth: 2,
        borderColor: '#fff',
    },
    emptyAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginLeft: -10,
        backgroundColor: '#f0f0f0',
        borderWidth: 2,
        borderColor: '#fff',
        borderStyle: 'dashed',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: '#999',
        fontSize: 16,
    },
    slotCardPending: {
        borderWidth: 1,
        borderColor: '#FFA000',
        backgroundColor: '#FFF8E1',
    },
    pendingBadge: {
        backgroundColor: '#FFA000',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    pendingText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default ScheduleScreen;
