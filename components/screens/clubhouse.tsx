import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, Image, TextInput, KeyboardAvoidingView, Platform,
    Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Users, Send, ArrowLeft, MessageSquare, Plus, LogOut } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

const ClubhouseScreen: React.FC = () => {
    // UI State
    const [view, setView] = useState<'lobby' | 'chat'>('lobby');
    const [activeClub, setActiveClub] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Data State
    const [myClubs, setMyClubs] = useState<any[]>([]);
    const [allClubs, setAllClubs] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        fetchUser();
        fetchClubs();
    }, []);

    useEffect(() => {
        if (userId) fetchMyClubs();
    }, [userId]);

    // Real-time Chat Subscription
    // Real-time Chat Subscription
    useEffect(() => {
        let channel: any;
        if (view === 'chat' && activeClub?.id) {
            const clubId = activeClub.id;
            fetchMessages(clubId);

            channel = supabase.channel(`club_chat:${clubId}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'club_messages', filter: `club_id=eq.${clubId}` },
                    (payload) => {
                        fetchMessages(clubId);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'club_memberships', filter: `club_id=eq.${clubId}` },
                    async () => {
                        // Update member count for this club
                        const { count } = await supabase
                            .from('club_memberships')
                            .select('*', { count: 'exact', head: true })
                            .eq('club_id', clubId);

                        if (count !== null) {
                            setActiveClub((prev: any) => prev?.id === clubId ? { ...prev, member_count: count } : prev);
                            setMyClubs(prev => prev.map(c => c.id === clubId ? { ...c, member_count: count } : c));
                            setAllClubs(prev => prev.map(c => c.id === clubId ? { ...c, member_count: count } : c));
                        }
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [view, activeClub?.id]);


    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            const { data } = await supabase
                .from('profiles')
                .select('first_name, last_name, handicap')
                .eq('id', user.id)
                .single();
            if (data) setCurrentUserProfile(data);
        }
    };

    const fetchClubs = async () => {
        // Fetch clubs and count of members
        const { data, error } = await supabase
            .from('clubs')
            .select('*, club_memberships(count)');

        if (data) {
            // Transform: Supabase returns { ..., club_memberships: [{ count: 5 }] }
            const processed = data.map((c: any) => ({
                ...c,
                member_count: c.club_memberships?.[0]?.count || 0
            }));
            setAllClubs(processed);
        }
    };

    const fetchMyClubs = async () => {
        const { data } = await supabase
            .from('club_memberships')
            .select(`
                club_id,
                clubs:club_id (*, club_memberships(count))
            `)
            .eq('user_id', userId);

        if (data) {
            // Flatten and process count
            const joined = data.map((item: any) => {
                const c = item.clubs;
                return {
                    ...c,
                    member_count: c.club_memberships?.[0]?.count || 0
                };
            });
            setMyClubs(joined);
        }
    };

    const fetchMessages = async (clubId: string) => {
        const { data, error } = await supabase
            .from('club_messages')
            .select(`
                id, content, created_at, user_id,
                profiles:user_id (first_name, last_name, handicap)
            `)
            .eq('club_id', clubId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
        }
    };

    const handleJoin = async (club: any) => {
        if (!userId) return;
        try {
            const { error } = await supabase
                .from('club_memberships')
                .insert([{ club_id: club.id, user_id: userId }]);

            if (error) throw error;
            Alert.alert("Welcome!", `You joined ${club.name}.`);
            fetchMyClubs();
        } catch (err: any) {
            // Duplicate key error means already joined, could handle gracefully
            if (err.code === '23505') Alert.alert("Heads up", "You are already a member here.");
            else Alert.alert("Error", err.message);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || !userId || !activeClub) return;

        const text = inputText.trim();
        setInputText(''); // optimize clear

        // Optimistic update
        const tempId = 'temp-' + Date.now();
        const optimisticMessage = {
            id: tempId,
            content: text,
            created_at: new Date().toISOString(),
            user_id: userId,
            profiles: currentUserProfile || { first_name: 'Me' } // Fallback
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        const { error } = await supabase
            .from('club_messages')
            .insert({
                club_id: activeClub.id,
                user_id: userId,
                content: text
            });

        if (error) {
            Alert.alert("Failed", error.message);
            // Revert optimistic update
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setInputText(text); // revert text
        }
    };

    const handleLeave = async () => {
        if (!userId || !activeClub) return;

        Alert.alert(
            "Leave Club",
            `Are you sure you want to leave ${activeClub.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('club_memberships')
                                .delete()
                                .eq('club_id', activeClub.id)
                                .eq('user_id', userId);

                            if (error) throw error;

                            Alert.alert("Left", `You left ${activeClub.name}.`);
                            setView('lobby');
                            setActiveClub(null);
                            fetchMyClubs();
                        } catch (err: any) {
                            Alert.alert("Error", err.message);
                        }
                    }
                }
            ]
        );
    };

    // Filter available clubs (exclude already joined)
    const myClubIds = new Set(myClubs.map(c => c.id));
    const filteredClubs = allClubs
        .filter(c => !myClubIds.has(c.id))
        .filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
        );

    // RENDER: LOBBY
    const renderLobby = () => (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Clubhouse</Text>
                <Text style={styles.headerSubtitle}>Find your community</Text>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search clubs or cities..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* My Clubs */}
                {myClubs.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>MY CLUBS</Text>
                        {myClubs.map(club => (
                            <TouchableOpacity
                                key={club.id}
                                style={styles.clubCard}
                                onPress={() => { setActiveClub(club); setView('chat'); }}
                            >
                                <Image source={{ uri: club.logo_url }} style={styles.clubLogo} />
                                <View style={styles.clubInfo}>
                                    <Text style={styles.clubName}>{club.name}</Text>
                                    <Text style={styles.clubMeta}>
                                        <Users size={12} color={COLORS.textLight} /> {club.member_count} Members
                                    </Text>
                                </View>
                                <View style={styles.enterBtn}>
                                    <Text style={styles.enterBtnText}>Enter</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* All Clubs */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DISCOVER CLUBS</Text>
                    {filteredClubs.map(club => (
                        <View key={club.id} style={styles.clubCard}>
                            <Image source={{ uri: club.logo_url }} style={styles.clubLogo} />
                            <View style={styles.clubInfo}>
                                <Text style={styles.clubName}>{club.name}</Text>
                                <Text style={styles.clubMeta}>{club.address}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.joinBtn}
                                onPress={() => handleJoin(club)}
                            >
                                <Text style={styles.joinBtnText}>Join</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {filteredClubs.length === 0 && (
                        <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No clubs found.</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );

    // RENDER: CHAT CHANNEL
    const renderChat = () => (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={{ flex: 1 }}
        >
            {/* Chat Header */}
            <View style={styles.chatHeader}>
                <TouchableOpacity onPress={() => { setView('lobby'); setActiveClub(null); }}>
                    <ArrowLeft size={24} color={COLORS.dark} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.chatTitle}>{activeClub?.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.chatStatus}>{activeClub?.member_count || 1} Members</Text>
                    </View>
                </View>
                {/* <Image source={{ uri: activeClub?.logo_url }} style={{ width: 32, height: 32, borderRadius: 16 }} /> */}
                <TouchableOpacity onPress={handleLeave} style={{ padding: 8 }}>
                    <LogOut size={20} color={COLORS.error} />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                style={styles.chatArea}
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                renderItem={({ item }) => {
                    const isMe = item.user_id === userId;
                    return (
                        <View style={[
                            styles.messageRow,
                            isMe ? styles.messageRowMe : styles.messageRowOther
                        ]}>
                            {!isMe && (
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{item.profiles?.first_name?.[0] || '?'}</Text>
                                </View>
                            )}
                            <View style={[
                                styles.bubble,
                                isMe ? styles.bubbleMe : styles.bubbleOther
                            ]}>
                                {!isMe && <Text style={styles.senderName}>{item.profiles?.first_name}</Text>}
                                <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.content}</Text>
                                <Text style={[styles.timeText, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: '#999' }]}>
                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    );
                }}
            />

            {/* Input */}
            <View style={styles.inputArea}>
                <TextInput
                    style={styles.inputField}
                    placeholder="Message..."
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                    <Send size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <SafeAreaView style={styles.container}>
            {view === 'lobby' ? renderLobby() : renderChat()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.dark,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginVertical: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: COLORS.dark,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textLight,
        marginBottom: 12,
        letterSpacing: 1,
    },
    clubCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 1,
    },
    clubLogo: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
    clubInfo: {
        flex: 1,
        marginLeft: 16,
    },
    clubName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    clubMeta: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 2,
    },
    joinBtn: {
        backgroundColor: '#F0F9FF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    joinBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    enterBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    enterBtnText: {
        color: COLORS.textLight,
        fontWeight: '500',
    },
    // Chat Styles
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        elevation: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    chatStatus: {
        fontSize: 12,
        color: COLORS.success,
        marginLeft: 6,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
    },
    chatArea: {
        flex: 1,
        backgroundColor: '#F2F4F6',
    },
    inputArea: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    inputField: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 16,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        maxWidth: '80%',
    },
    messageRowMe: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    messageRowOther: {
        alignSelf: 'flex-start',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginTop: 4, // Align top
    },
    avatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    bubble: {
        padding: 12,
        borderRadius: 16,
    },
    bubbleMe: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 2,
    },
    bubbleOther: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 2,
    },
    senderName: {
        fontSize: 11,
        color: COLORS.textLight, // lighter for name
        marginBottom: 4,
        fontWeight: '600',
    },
    messageText: {
        fontSize: 15,
        color: COLORS.dark,
        lineHeight: 20,
    },
    messageTextMe: {
        color: '#fff',
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
});

export default ClubhouseScreen;
