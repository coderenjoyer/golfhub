import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Modal, Alert, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, TrendingUp, Calendar, ChevronRight, Settings, AlertCircle, LogOut, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { COLORS } from '../../../constants/colors';
import { supabase } from '../../../lib/supabase';

// ... (Existing code)



const AdminDashboard: React.FC = () => {
    const navigation = useNavigation<any>();

    // State
    const [requests, setRequests] = React.useState<any[]>([]);
    const [tournaments, setTournaments] = React.useState<any[]>([]);
    const [clubs, setClubs] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
    const [modalVisible, setModalVisible] = React.useState(false);

    // Action State (Bookings)  
    const [adminNote, setAdminNote] = React.useState('');
    const [actionType, setActionType] = React.useState<'reject' | 'propose' | null>(null);

    // Tournament State
    const [createTournamentModal, setCreateTournamentModal] = React.useState(false);
    const [newTournament, setNewTournament] = React.useState({
        name: '', date: '', start_time: '07:00', max_participants: '100', format: 'Stroke Play', registration_fee: '0'
    });
    const [activeTournament, setActiveTournament] = React.useState<any>(null); // For Detail View
    const [activeTab, setActiveTab] = React.useState<'overview' | 'players' | 'draw' | 'scoring'>('overview');

    // Club/Venue State
    const [createClubModal, setCreateClubModal] = React.useState(false);
    const [editingClubId, setEditingClubId] = React.useState<string | null>(null);
    const [newClub, setNewClub] = React.useState({
        name: '', address: '', logo_url: '', is_private: false, verification_code: ''
    });
    const [uploading, setUploading] = React.useState(false);

    React.useEffect(() => {
        fetchRequests();
        fetchTournaments();
        fetchClubs();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                profiles:user_id (first_name, last_name, handicap)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching requests:', error);
        } else {
            setRequests(data || []);
        }
        setLoading(false);
    };

    const fetchTournaments = async () => {
        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .order('date', { ascending: true });
        if (!error) setTournaments(data || []);
    };

    const fetchClubs = async () => {
        const { data, error } = await supabase.from('clubs').select('*').order('created_at', { ascending: false });
        if (!error) setClubs(data || []);
    };

    const handleCreateTournament = async () => {
        if (!newTournament.name || !newTournament.date) {
            Alert.alert("Missing Fields", "Please fill in Name and Date.");
            return;
        }
        try {
            const { error } = await supabase.from('tournaments').insert([{
                name: newTournament.name,
                date: newTournament.date, // Assuming YYYY-MM-DD for now
                start_time: newTournament.start_time,
                max_participants: parseInt(newTournament.max_participants),
                format: newTournament.format,
                registration_fee: parseFloat(newTournament.registration_fee)
            }]);
            if (error) throw error;
            Alert.alert("Success", "Tournament Created!");
            setCreateTournamentModal(false);
            fetchTournaments();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

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
            setUploading(true);
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('club_assets')
                .upload(filePath, decode(base64Data), {
                    contentType: `image/${fileExt}`,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('club_assets')
                .getPublicUrl(filePath);

            if (data && data.publicUrl) {
                setNewClub(prev => ({ ...prev, logo_url: data.publicUrl }));
            }
        } catch (error: any) {
            Alert.alert("Upload Error", error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCreateOrUpdateClub = async () => {
        if (!newClub.name) {
            Alert.alert("Missing Fields", "Club Name is required.");
            return;
        }
        try {
            if (editingClubId) {
                // Update Existing
                const { error } = await supabase.from('clubs').update({
                    name: newClub.name,
                    address: newClub.address,
                    logo_url: newClub.logo_url,
                    is_private: newClub.is_private,
                    verification_code: newClub.verification_code
                }).eq('id', editingClubId);

                if (error) throw error;
                Alert.alert("Success", "Club Updated!");
            } else {
                // Create New
                const { error } = await supabase.from('clubs').insert([{
                    name: newClub.name,
                    address: newClub.address,
                    logo_url: newClub.logo_url || 'https://placehold.co/200x200/png?text=Club',
                    is_private: newClub.is_private,
                    verification_code: newClub.verification_code
                }]);
                if (error) throw error;
                Alert.alert("Success", "Club Venue Created!");
            }

            setCreateClubModal(false);
            setEditingClubId(null);
            fetchClubs();
            setNewClub({ name: '', address: '', logo_url: '', is_private: false, verification_code: '' });
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const handleDeleteClub = async () => {
        if (!editingClubId) return;
        Alert.alert("Confirm Delete", "Are you sure you want to delete this club? This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        const { error } = await supabase.from('clubs').delete().eq('id', editingClubId);
                        if (error) throw error;
                        Alert.alert("Deleted", "Club removed successfully.");
                        setCreateClubModal(false);
                        setEditingClubId(null);
                        fetchClubs();
                    } catch (err: any) {
                        Alert.alert("Error", err.message);
                    }
                }
            }
        ]);
    };

    const openEditClubModal = (club: any) => {
        setEditingClubId(club.id);
        setNewClub({
            name: club.name,
            address: club.address || '',
            logo_url: club.logo_url || '',
            is_private: club.is_private || false,
            verification_code: club.verification_code || ''
        });
        setCreateClubModal(true);
    };

    const openCreateClubModal = () => {
        setEditingClubId(null);
        setNewClub({ name: '', address: '', logo_url: '', is_private: false, verification_code: '' });
        setCreateClubModal(true);
    };

    const handleAction = async (status: string, note?: string) => {
        if (!selectedRequest) return;

        try {
            const updateData: any = {
                status: status,
                admin_note: note
            };

            // If proposing, we might want to set proposed_time logic here in V2
            // For now, let's just use the note to communicate the proposed time or reason.

            const { error } = await supabase
                .from('bookings')
                .update(updateData)
                .eq('id', selectedRequest.id);

            if (error) throw error;

            // Send Notification
            const notifTitle = status === 'confirmed' ? 'Booking Approved!' : (status === 'rejected' ? 'Booking Rejected' : 'Booking Update');
            const notifBody = status === 'confirmed'
                ? `Your game for ${new Date(selectedRequest.start_time).toLocaleDateString()} has been confirmed.`
                : (note ? `Admin note: ${note}` : `There is an update on your booking request.`);

            await supabase.from('notifications').insert({
                user_id: selectedRequest.user_id,
                title: notifTitle,
                body: notifBody,
                type: 'booking_update',
                related_entity_id: selectedRequest.id
            });

            Alert.alert("Success", `Request ${status}.`);
            setModalVisible(false);
            fetchRequests(); // Refresh
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const openActionModal = (req: any) => {
        setSelectedRequest(req);
        setAdminNote('');
        setActionType(null); // Reset
        setModalVisible(true);
    };

    // --- Sub-Component: Tournament Detail Manager ---
    const renderTournamentManager = () => {
        if (!activeTournament) return null;
        return (
            <View style={styles.managerContainer}>
                <View style={styles.managerHeader}>
                    <TouchableOpacity onPress={() => setActiveTournament(null)} style={{ padding: 8 }}>
                        <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.managerTitle}>{activeTournament.name}</Text>
                    <View style={{ width: 50 }} />
                </View>

                {/* Tabs */}
                <View style={styles.tabsRow}>
                    {['overview', 'players', 'draw', 'scoring'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                            onPress={() => setActiveTab(tab as any)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.tabContent}>
                    {activeTab === 'overview' && (
                        <View>
                            <Text style={styles.label}>Date: {activeTournament.date}</Text>
                            <Text style={styles.label}>Format: {activeTournament.format}</Text>
                            <Text style={styles.label}>Fee: ${activeTournament.registration_fee}</Text>
                            <Text style={styles.label}>Status: {activeTournament.status ? activeTournament.status.toUpperCase() : 'N/A'}</Text>
                            {/* Edit Button Placeholder */}
                            <TouchableOpacity style={[styles.actionButton, { marginTop: 20 }]}>
                                <Text style={styles.actionButtonText}>Edit Details</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {activeTab === 'players' && (
                        <View style={{ alignItems: 'center', padding: 20 }}>
                            <Users size={40} color="#ccc" />
                            <Text style={{ color: '#999', marginTop: 10 }}>Player roster management coming soon.</Text>
                        </View>
                    )}
                    {activeTab === 'draw' && (
                        <View style={{ alignItems: 'center', padding: 20 }}>
                            <Calendar size={40} color="#ccc" />
                            <Text style={{ color: '#999', marginTop: 10 }}>Drag & Drop flight management coming soon.</Text>
                        </View>
                    )}
                    {activeTab === 'scoring' && (
                        <View style={{ alignItems: 'center', padding: 20 }}>
                            <TrendingUp size={40} color="#ccc" />
                            <Text style={{ color: '#999', marginTop: 10 }}>Live scoring grid coming soon.</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (activeTournament) {
        return (
            <SafeAreaView style={styles.container}>
                {renderTournamentManager()}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.headerTitle}>Command Center</Text>
                    <Text style={styles.headerSubtitle}>Admin Control Panel</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={styles.settingsButton} onPress={async () => {
                        if (Platform.OS === 'web') {
                            if (window.confirm("Are you sure you want to log out?")) {
                                try {
                                    console.log("Signing out...");
                                    const { error } = await supabase.auth.signOut();
                                    if (error) throw error;
                                } catch (err: any) {
                                    console.log("Logout warning (likely already sessionless):", err.message);
                                } finally {
                                    // FORCE CLEAR STORAGE: This removes the persisted session token
                                    localStorage.clear();
                                    // Always force reload to clear client state/UI
                                    window.location.reload();
                                }
                            }
                        } else {
                            Alert.alert("Logout", "Confirm logout?", [
                                { text: "Cancel", style: "cancel" },
                                { text: "Logout", style: "destructive", onPress: () => supabase.auth.signOut() }
                            ]);
                        }
                    }}>
                        <LogOut color={COLORS.error} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Key Metrics Grid */}
                <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                            <Users size={22} color="#1565C0" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{requests.length}</Text>
                            <Text style={styles.statLabel}>Pending Requests</Text>
                        </View>
                        {requests.length > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Action Needed</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                            <TrendingUp size={22} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.statValue}>80%</Text>
                            <Text style={styles.statLabel}>Today's Utilization</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* REQUESTS LIST */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Booking Requests</Text>
                        <TouchableOpacity onPress={fetchRequests}>
                            <Text style={styles.actionText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardContainer}>
                        {requests.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: COLORS.textLight }}>No pending requests.</Text>
                            </View>
                        ) : (
                            requests.map((req) => (
                                <TouchableOpacity key={req.id} style={styles.listRow} onPress={() => openActionModal(req)}>
                                    <View style={styles.listIcon}>
                                        <Calendar size={20} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.listContent}>
                                        <Text style={styles.listTitle}>
                                            {req.profiles?.first_name} {req.profiles?.last_name || ''}
                                        </Text>
                                        <Text style={styles.listSubtitle}>
                                            {new Date(req.start_time).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric' })} • {req.player_count} Players
                                        </Text>
                                        {req.user_note && (
                                            <Text style={styles.noteText}>"{req.user_note}"</Text>
                                        )}
                                    </View>
                                    <View style={styles.chevronBox}>
                                        <ChevronRight size={20} color={COLORS.textLight} />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>

                {/* TOURNAMENTS SECTION */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Tournaments</Text>
                        <TouchableOpacity onPress={() => setCreateTournamentModal(true)}>
                            <Text style={styles.actionText}>+ Create</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardContainer}>
                        {tournaments.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: COLORS.textLight }}>No upcoming tournaments.</Text>
                            </View>
                        ) : (
                            tournaments.map((t) => (
                                <TouchableOpacity key={t.id} style={styles.listRow} onPress={() => setActiveTournament(t)}>
                                    <View style={styles.listIcon}>
                                        <TrendingUp size={20} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.listContent}>
                                        <Text style={styles.listTitle}>{t.name}</Text>
                                        <Text style={styles.listSubtitle}>{t.date} • {t.status ? t.status.toUpperCase() : 'N/A'}</Text>
                                    </View>
                                    <ChevronRight size={20} color={COLORS.textLight} />
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>

                {/* CLUBS / VENUES SECTION */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Venue Management</Text>
                        <TouchableOpacity onPress={openCreateClubModal}>
                            <Text style={styles.actionText}>+ Add Club</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardContainer}>
                        {clubs.length === 0 ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: COLORS.textLight }}>No venues added yet.</Text>
                            </View>
                        ) : (
                            clubs.map((c) => (
                                <TouchableOpacity key={c.id} style={styles.listRow} onPress={() => openEditClubModal(c)}>
                                    <View style={styles.listIcon}>
                                        <MapPin size={20} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.listContent}>
                                        <Text style={styles.listTitle}>{c.name}</Text>
                                        <Text style={styles.listSubtitle}>{c.address}</Text>
                                    </View>
                                    <View style={styles.chevronBox}>
                                        <Settings size={20} color={COLORS.textLight} />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Create Tournament Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={createTournamentModal}
                onRequestClose={() => setCreateTournamentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Tournament</Text>

                        <Text style={styles.inputLabel}>Event Name</Text>
                        <TextInput style={styles.textInputSingle} value={newTournament.name} onChangeText={t => setNewTournament({ ...newTournament, name: t })} placeholder="e.g. Club Championship" />

                        <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                        <TextInput style={styles.textInputSingle} value={newTournament.date} onChangeText={t => setNewTournament({ ...newTournament, date: t })} placeholder="2026-11-15" />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Format</Text>
                                <TextInput style={styles.textInputSingle} value={newTournament.format} onChangeText={t => setNewTournament({ ...newTournament, format: t })} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Fee ($)</Text>
                                <TextInput style={styles.textInputSingle} value={newTournament.registration_fee} onChangeText={t => setNewTournament({ ...newTournament, registration_fee: t })} keyboardType="numeric" />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                            <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: '#ccc' }]} onPress={() => setCreateTournamentModal(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.primary }]} onPress={handleCreateTournament}>
                                <Text style={styles.modalBtnText}>Create Event</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Create Club Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={createClubModal}
                onRequestClose={() => setCreateClubModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingClubId ? 'Edit Venue' : 'Add New Venue'}</Text>

                        <Text style={styles.inputLabel}>Club Name</Text>
                        <TextInput
                            style={styles.textInputSingle}
                            value={newClub.name}
                            onChangeText={t => setNewClub({ ...newClub, name: t })}
                            placeholder="e.g. Cebu Country Club"
                        />

                        <Text style={styles.inputLabel}>Address / Location</Text>
                        <TextInput
                            style={styles.textInputSingle}
                            value={newClub.address}
                            onChangeText={t => setNewClub({ ...newClub, address: t })}
                            placeholder="e.g. Banilad, Cebu City"
                        />

                        <Text style={styles.inputLabel}>Club Logo</Text>
                        <View style={{ marginBottom: 16 }}>
                            {newClub.logo_url ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <Image
                                        source={{ uri: newClub.logo_url }}
                                        style={{ width: 60, height: 60, borderRadius: 12, marginRight: 12, backgroundColor: '#f0f0f0' }}
                                    />
                                    <Text style={{ flex: 1, color: COLORS.textLight, fontSize: 12 }}>{newClub.logo_url.split('/').pop()}</Text>
                                </View>
                            ) : null}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 12,
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: '#e0e0e0',
                                    borderStyle: 'dashed'
                                }}
                                onPress={pickImage}
                                disabled={uploading}
                            >
                                <Text style={{ color: COLORS.dark, fontWeight: '600' }}>
                                    {uploading ? 'Uploading...' : (newClub.logo_url ? 'Change Logo' : 'Select Logo Image')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={styles.inputLabel}>Private Club?</Text>
                            <Switch
                                value={newClub.is_private}
                                onValueChange={v => setNewClub({ ...newClub, is_private: v })}
                                trackColor={{ false: '#eee', true: COLORS.primary }}
                            />
                        </View>

                        {newClub.is_private && (
                            <View>
                                <Text style={styles.inputLabel}>Verification Code</Text>
                                <TextInput
                                    style={styles.textInputSingle}
                                    value={newClub.verification_code}
                                    onChangeText={t => setNewClub({ ...newClub, verification_code: t })}
                                    placeholder="e.g. MEMBER2026"
                                />
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                            <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: '#ccc' }]} onPress={() => setCreateClubModal(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.primary }]} onPress={handleCreateOrUpdateClub}>
                                <Text style={styles.modalBtnText}>{editingClubId ? 'Save Changes' : 'Create Club'}</Text>
                            </TouchableOpacity>
                        </View>

                        {editingClubId && (
                            <TouchableOpacity
                                style={[styles.modalBtn, { marginTop: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.error }]}
                                onPress={handleDeleteClub}
                            >
                                <Text style={[styles.modalBtnText, { color: COLORS.error }]}>Delete Venue</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Action Modal */}
            {modalVisible && selectedRequest && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Handle Request</Text>
                        <Text style={styles.modalSubtitle}>
                            {selectedRequest.profiles?.first_name} requested {selectedRequest.player_count} slots for {'\n'}
                            {new Date(selectedRequest.start_time).toLocaleString()}
                        </Text>

                        {actionType === null ? (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: COLORS.success }]}
                                    onPress={() => handleAction('confirmed')}
                                >
                                    <Text style={styles.modalBtnText}>Approve Request</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: COLORS.info, marginTop: 10 }]}
                                    onPress={() => setActionType('propose')}
                                >
                                    <Text style={styles.modalBtnText}>Propose Change</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: COLORS.error, marginTop: 10 }]}
                                    onPress={() => setActionType('reject')}
                                >
                                    <Text style={styles.modalBtnText}>Reject Request</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: '#ccc', marginTop: 10 }]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.inputLabel}>
                                    {actionType === 'reject' ? 'Reason for Rejection:' : 'Proposed Time / Note:'}
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Type your message here..."
                                    value={adminNote}
                                    onChangeText={setAdminNote}
                                    multiline
                                />
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, { flex: 1, backgroundColor: '#ccc' }]}
                                        onPress={() => setActionType(null)}
                                    >
                                        <Text style={styles.modalBtnText}>Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.dark }]}
                                        onPress={() => handleAction(actionType === 'reject' ? 'rejected' : 'proposed', adminNote)}
                                    >
                                        <Text style={styles.modalBtnText}>Submit</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.dark,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 2,
    },
    settingsButton: {
        padding: 8,
        backgroundColor: COLORS.gray,
        borderRadius: 12,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        justifyContent: 'space-between',
        minHeight: 140,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    badge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: COLORS.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    actionText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    cardContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    listIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.lightBlue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 4,
    },
    listSubtitle: {
        fontSize: 13,
        color: COLORS.textLight,
    },
    noteText: {
        fontSize: 12,
        color: COLORS.textLight,
        fontStyle: 'italic',
        marginTop: 4,
    },
    chevronBox: {
        paddingLeft: 8,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: COLORS.dark,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryAction: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.gray,
        shadowColor: '#000',
        shadowOpacity: 0.05,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    secondaryActionText: {
        color: COLORS.dark,
    },
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    actionButtons: {
        width: '100%',
    },
    modalBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
        fontSize: 16,
    },
    textInputSingle: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    managerContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    managerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    managerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    tabsRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabItem: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '600',
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    tabContent: {
        padding: 20,
        flex: 1,
    },
    label: {
        fontSize: 16,
        color: COLORS.dark,
        marginBottom: 12,
        fontWeight: '500',
    },
});

export default AdminDashboard;
