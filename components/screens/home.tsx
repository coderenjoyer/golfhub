import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell, Calendar as CalendarIcon, MapPin } from 'lucide-react-native'; // Added icons to utilize in cards

import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simulate data re-fetch
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
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
                    <TouchableOpacity style={styles.iconButton}>
                        <Bell color={COLORS.white} size={24} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.profileButton}>
                        <Image
                            source={{ uri: 'https://i.pravatar.cc/100?u=user' }}
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

                    {/* Scenario 2: No Upcoming Bookings */}
                    <View style={[styles.heroCard, { backgroundColor: COLORS.primary }]}>
                        <View style={styles.heroContent}>
                            <Text style={styles.heroMessage}>No upcoming games.</Text>
                            <Text style={styles.heroSubMessage}>Find a tee time and invite your buddies!</Text>

                            <TouchableOpacity
                                style={styles.heroButton}
                                onPress={() => navigation.navigate('Schedule')}
                            >
                                <Text style={styles.heroButtonText}>View Schedule</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Upcoming Tournaments Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Upcoming Tournaments</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Tournaments')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContent}>
                        {/* Mock Tournament Card 1 */}
                        <TouchableOpacity style={styles.tournamentCard} onPress={() => navigation.navigate('Tournaments')}>
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=2070&auto=format&fit=crop' }}
                                style={styles.tournamentImage}
                            />
                            <View style={styles.tournamentInfo}>
                                <Text style={styles.tournamentTitle}>Summer Open 2026</Text>
                                <View style={styles.tournamentMeta}>
                                    <CalendarIcon size={14} color={COLORS.textLight} />
                                    <Text style={styles.tournamentDate}>Nov 15, 2026</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Mock Tournament Card 2 */}
                        <TouchableOpacity style={styles.tournamentCard} onPress={() => navigation.navigate('Tournaments')}>
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2070&auto=format&fit=crop' }}
                                style={styles.tournamentImage}
                            />
                            <View style={styles.tournamentInfo}>
                                <Text style={styles.tournamentTitle}>Wack Wack Charity</Text>
                                <View style={styles.tournamentMeta}>
                                    <CalendarIcon size={14} color={COLORS.textLight} />
                                    <Text style={styles.tournamentDate}>Dec 05, 2026</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
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
});


export default HomeScreen;
