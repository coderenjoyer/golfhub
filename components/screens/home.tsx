import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
    Image,
    RefreshControl,
    ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell, Calendar as CalendarIcon, MapPin } from 'lucide-react-native'; // Added icons to utilize in cards

import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

const HomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [nextGame, setNextGame] = useState<any>(null);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Cache Keys
    const DASHBOARD_CACHE_KEY = 'golfhub_dashboard_data';
    const FIRST_LAUNCH_KEY = 'golfhub_has_launched';

    // Mock Data for "fetch"
    const MOCK_DATA = {
        nextGame: null, // Change this to an object to see a booked game
        tournaments: []
    };

    const loadData = async (isRefresh = false) => {
        if (!isRefresh) setIsLoading(true);
        try {
            // Simulate API Network Request
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Fetch Next Game and Avatar
            const { data: { user } } = await supabase.auth.getUser();
            let realNextGame = null;
            let userAvatar = null;

            if (user) {
                // Fetch Avatar
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .single();

                if (profile) userAvatar = profile.avatar_url;

                const { data: bookings } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'confirmed')
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(1);

                if (bookings && bookings.length > 0) {
                    const b = bookings[0];
                    const dateObj = new Date(b.start_time);
                    realNextGame = {
                        courseName: 'Clubhouse Course', // Placeholder or join with course/club table if exists
                        date: format(dateObj, 'MMM d, yyyy'),
                        time: format(dateObj, 'h:mm a')
                    };

                    // Check for Game Today Notification
                    const isToday = new Date(b.start_time).toDateString() === new Date().toDateString();
                    if (isToday) {
                        const { count } = await supabase.from('notifications')
                            .select('id', { count: 'exact', head: true })
                            .eq('related_entity_id', b.id)
                            .eq('type', 'game_reminder');

                        if (count === 0) {
                            await supabase.from('notifications').insert({
                                user_id: user.id,
                                title: 'Golf Game Today!',
                                body: `You have a game schedule today at ${format(dateObj, 'h:mm a')}. Good luck!`,
                                type: 'game_reminder',
                                related_entity_id: b.id
                            });
                        }
                    }
                }
            }

            // In a real app, this would be: const response = await api.getDashboard();
            const newData = {
                nextGame: realNextGame,
                tournaments: MOCK_DATA.tournaments // Keep mock tournaments for now
            };

            setNextGame(newData.nextGame);
            setTournaments(newData.tournaments);
            if (userAvatar) setAvatarUrl(userAvatar);

            // Cache the fresh data
            await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(newData));

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            Alert.alert('Error', 'Could not refresh data.');
        } finally {
            if (isRefresh) setRefreshing(false);
            setIsLoading(false);
        }
    };

    const loadCachedData = async () => {
        try {
            const cachedString = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
            if (cachedString) {
                const cachedData = JSON.parse(cachedString);
                setNextGame(cachedData.nextGame);
                setTournaments(cachedData.tournaments);
            }
        } catch (error) {
            console.log('No cached data found or error reading cache');
        }
    };

    const checkFirstLaunch = async () => {
        try {
            const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
            if (hasLaunched === null) {
                // First time launching
                Alert.alert("Welcome to GolfBuddy!", "Track your games, join tournaments, and connect with friends.");
                await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
            }
        } catch (error) {
            console.error('Error checking first launch', error);
        }
    };

    useEffect(() => {
        // 1. Check first launch
        checkFirstLaunch();

        // 2. Load cached data immediately for speed
        loadCachedData();

        // 3. Fetch fresh data in background
        loadData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData(true);
    }, []);

    const handleLogout = async () => {
        const performLogout = async () => {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Error signing out:', error.message);
                }
            } catch (err) {
                console.error('Unexpected error signing out:', err);
            } finally {
                // Attempt to refresh session - if invalid, it should update null state in App.tsx
                const { data } = await supabase.auth.refreshSession();
                if (!data.session) {
                    // Triggers the state change in App.tsx naturally
                }
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to log out?")) {
                await performLogout();
            }
        } else {
            Alert.alert(
                "Confirm Logout",
                "Are you sure you want to log out?",
                [
                    {
                        text: "Cancel",
                        style: "cancel"
                    },
                    {
                        text: "Logout",
                        onPress: performLogout,
                        style: 'destructive'
                    }
                ]
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* ... Header ... */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>GolfBuddy</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications')}>
                        <Bell color={COLORS.white} size={24} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.profileButton}>
                        <Image
                            source={{ uri: avatarUrl || 'https://i.pravatar.cc/100?u=user' }}
                            style={styles.headerAvatar}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >

                {/* Hero Section: Your Next Game */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Your Next Game</Text>

                    {/* Dynamic Hero Section */}
                    {nextGame ? (
                        <ImageBackground
                            source={require('../../public/golf_card.png')}
                            style={[styles.heroCard, { backgroundColor: COLORS.secondary }]}
                            imageStyle={{ borderRadius: 20, opacity: 0.9 }}
                            resizeMode="cover"
                        >
                            <View style={[styles.heroContent, { backgroundColor: 'rgba(0,0,0,0.3)', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={styles.heroMessage}>Upcoming: {nextGame.courseName}</Text>
                                <Text style={styles.heroSubMessage}>{nextGame.date} @ {nextGame.time}</Text>

                                <TouchableOpacity
                                    style={styles.heroButton}
                                    onPress={() => navigation.navigate('Schedule')}
                                >
                                    <Text style={styles.heroButtonText}>View Details</Text>
                                </TouchableOpacity>
                            </View>
                        </ImageBackground>
                    ) : (
                        <ImageBackground
                            source={require('../../public/golf_card.png')}
                            style={[styles.heroCard, { backgroundColor: COLORS.primary }]}
                            imageStyle={{ borderRadius: 20, opacity: 0.9 }}
                            resizeMode="cover"
                        >
                            <View style={[styles.heroContent, { backgroundColor: 'rgba(0,0,0,0.3)', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={styles.heroMessage}>No upcoming games.</Text>
                                <Text style={styles.heroSubMessage}>Find a tee time and invite your buddies!</Text>

                                <TouchableOpacity
                                    style={styles.heroButton}
                                    onPress={() => navigation.navigate('Schedule')}
                                >
                                    <Text style={styles.heroButtonText}>View Schedule</Text>
                                </TouchableOpacity>
                            </View>
                        </ImageBackground>
                    )}
                </View>

                {/* Upcoming Tournaments Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Upcoming Tournaments</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Tournaments')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {tournaments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No upcoming tournaments yet.</Text>
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContent}>
                            {tournaments.map((tournament) => (
                                <TouchableOpacity
                                    key={tournament.id}
                                    style={styles.tournamentCard}
                                    onPress={() => navigation.navigate('Tournaments')}
                                >
                                    <Image
                                        source={{ uri: tournament.image }}
                                        style={styles.tournamentImage}
                                    />
                                    <View style={styles.tournamentInfo}>
                                        <Text style={styles.tournamentTitle}>{tournament.title}</Text>
                                        <View style={styles.tournamentMeta}>
                                            <CalendarIcon size={14} color={COLORS.textLight} />
                                            <Text style={styles.tournamentDate}>{tournament.date}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

            </ScrollView>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 8,
        marginRight: 8,
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.error,
    },
    profileButton: {
        marginLeft: 8,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 32,
    },
    comingSoon: {
        fontSize: 16,
        color: '#999',
    },
    sectionContainer: {
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    heroCard: {
        borderRadius: 20,
        padding: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
        minHeight: 180,
    },
    heroContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroMessage: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubMessage: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginBottom: 24,
        textAlign: 'center',
    },
    heroButton: {
        backgroundColor: COLORS.white,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    heroButtonText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    seeAllText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    carouselContent: {
        paddingRight: 16,
    },
    tournamentCard: {
        width: 260,
        height: 180,
        marginRight: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    tournamentImage: {
        width: '100%',
        height: 110,
        backgroundColor: '#e1e1e1',
    },
    tournamentInfo: {
        padding: 12,
    },
    tournamentTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 4,
    },
    tournamentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tournamentDate: {
        fontSize: 12,
        color: COLORS.textLight,
        marginLeft: 6,
    },
    emptyContainer: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: COLORS.textLight,
        fontSize: 14,
        fontStyle: 'italic',
    },
});


export default HomeScreen;
