import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/colors';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Alert,
    Platform,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Users, Bell, Lock, Edit2, ChevronRight, LogOut } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setLoading(false);
                return;
            }

            // check if profile exists
            let { data, error, status } = await supabase
                .from('profiles')
                .select(`*`)
                .eq('id', session.user.id)
                .maybeSingle();

            if (error && status !== 406) {
                throw error;
            }

            // If no profile exists (old user), create one
            if (!data) {
                console.log('Profile missing, creating default profile...');
                const { user } = session;
                const newProfile = {
                    id: user.id,
                    first_name: user.user_metadata.first_name || 'Golfer',
                    last_name: user.user_metadata.last_name || '',
                    phone: user.user_metadata.phone || '',
                    role: user.user_metadata.role || 'user',
                    avatar_url: user.user_metadata.avatar_url || '',
                };

                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([newProfile]);

                if (insertError) throw insertError;

                // Set the data to the new profile
                data = newProfile;
            }

            // Fetch Confirmed Games Count
            const { count, error: countError } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)
                .eq('status', 'confirmed');

            if (!countError && data) {
                // Ensure games_played is set on data, even if data comes from newProfile or fetched profile
                data.games_played = count || 0;
            }

            if (data) {
                setProfile(data);
            }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('Error fetching profile', error.message);
            }
        } finally {
            setLoading(false);
        }
    }

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.base64) {
                    uploadImage(asset.base64, asset.uri);
                }
            }
        } catch (error) {
            console.log("Error picking image:", error);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const uploadImage = async (base64Data: string, uri: string) => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64Data), {
                    contentType: `image/${fileExt}`,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            if (data && data.publicUrl) {
                // Update profile in DB
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ avatar_url: data.publicUrl })
                    .eq('id', session.user.id);

                if (updateError) throw updateError;

                // Update local state
                setProfile((prev: any) => ({ ...prev, avatar_url: data.publicUrl }));
                Alert.alert("Success", "Profile picture updated!");
            }
        } catch (error: any) {
            Alert.alert("Upload Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const performLogout = async () => {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) console.error('Error signing out:', error.message);
            } catch (err) {
                console.error('Unexpected error signing out:', err);
            } finally {
                // Determine if we need to refresh or navigation will handle it
                // Usually signOut invalidates the session automatically
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
                    style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={loading}>
                            <Image
                                source={{ uri: profile?.avatar_url || 'https://i.pravatar.cc/200?u=empty' }}
                                style={styles.avatar}
                            />
                            <View style={styles.editIconContainer}>
                                <Edit2 size={12} color={COLORS.primary} />
                            </View>
                        </TouchableOpacity>

                        <Text style={styles.userName}>
                            {profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Golfer' : 'Loading...'}
                        </Text>
                        <Text style={styles.userClub}>
                            {profile?.club_name || 'No Club Selected'} • {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Member'}
                        </Text>
                    </View>
                </LinearGradient>

                {/* 2. Stats Row */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Handicap</Text>
                        <Text style={[styles.statValue, { color: COLORS.primary }]}>
                            {profile?.handicap !== undefined ? profile.handicap : '-'}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Games</Text>
                        <Text style={styles.statValue}>
                            {profile?.games_played !== undefined ? profile.games_played : '-'}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Friends</Text>
                        <Text style={styles.statValue}>
                            {profile?.friends_count !== undefined ? profile.friends_count : '-'}
                        </Text>
                    </View>
                </View>

                {/* 3. Menu List */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={() => {
                                if (item.id === 'schedule') {
                                    navigation.navigate('MyBookings');
                                } else if (item.id === 'notifications') {
                                    navigation.navigate('Notifications');
                                } else {
                                    // Placeholder for others
                                    Alert.alert(item.label, "Feature coming soon");
                                }
                            }}
                        >
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
        // paddingTop: 60, // Handled dynamically now
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
