import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/colors';
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Alert,
    Platform,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Users, Bell, Lock, Edit2, ChevronRight, LogOut } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
    // Determine gradient colors based on request: Sky Blue (#0288D1) to Fairway Green (#2E7D32)
    // Using closest approximation or updating constants if allowed. I will use the hex codes directly as requested.

    const handleLogout = async () => {
        const performLogout = async () => {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) console.error('Error signing out:', error.message);
            } catch (err) {
                console.error('Unexpected error signing out:', err);
            } finally {
                const { data } = await supabase.auth.refreshSession();
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
                    { text: "Cancel", style: "cancel" },
                    { text: "Logout", onPress: performLogout, style: 'destructive' }
                ]
            );
        }
    };

    const menuItems = [
        { id: 'schedule', label: 'My Schedule', icon: Calendar, iconColor: '#2196F3' }, // Blue
        { id: 'buddies', label: 'My Buddies', icon: Users, iconColor: '#4CAF50' }, // Green
        { id: 'notifications', label: 'Notifications', icon: Bell, iconColor: '#FF9800' }, // Orange
        { id: 'privacy', label: 'Privacy & Security', icon: Lock, iconColor: '#9E9E9E' }, // Grey
    ];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* 1. Header Section */}
                <LinearGradient
                    colors={['#0288D1', '#2E7D32']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: 'https://i.pravatar.cc/200?u=evan' }}
                                style={styles.avatar}
                            />
                            <View style={styles.editIconContainer}>
                                <Edit2 size={12} color={COLORS.primary} />
                            </View>
                        </View>

                        <Text style={styles.userName}>Evan</Text>
                        <Text style={styles.userClub}>Tanjay Golf Club • Member</Text>
                    </View>
                </LinearGradient>

                {/* 2. Stats Row */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Handicap</Text>
                        <Text style={[styles.statValue, { color: COLORS.primary }]}>12.4</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Games</Text>
                        <Text style={styles.statValue}>24</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Friends</Text>
                        <Text style={styles.statValue}>15</Text>
                    </View>
                </View>

                {/* 3. Menu List */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity key={item.id} style={styles.menuItem}>
                            <View style={styles.menuLeft}>
                                <View style={[styles.menuIconBox, { backgroundColor: item.iconColor + '20' }]}>
                                    <item.icon size={20} color={item.iconColor} />
                                </View>
                                <Text style={styles.menuText}>{item.label}</Text>
                            </View>
                            <ChevronRight size={20} color="#ccc" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 4. Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <LogOut size={18} color="#D32F2F" style={{ marginRight: 8 }} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                    <Text style={styles.versionText}>v1.0.2</Text>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerGradient: {
        height: 280,
        paddingTop: 60, // approximate status bar
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    userClub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: -30, // Overlap
        borderRadius: 15,
        paddingVertical: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: '#eee',
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    menuContainer: {
        paddingHorizontal: 20,
        marginTop: 30,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
        paddingBottom: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderWidth: 1,
        borderColor: '#D32F2F',
        borderRadius: 25,
        marginBottom: 16,
    },
    logoutText: {
        color: '#D32F2F',
        fontSize: 16,
        fontWeight: '600',
    },
    versionText: {
        color: '#999',
        fontSize: 12,
    },
});

export default ProfileScreen;
