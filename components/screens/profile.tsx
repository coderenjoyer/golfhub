import React from 'react';
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    ScrollView,
    Image,
} from 'react-native';

const ProfileScreen: React.FC = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>
                <View style={styles.content}>
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/200?u=evan' }}
                        style={styles.avatar}
                    />
                    <Text style={styles.name}>Evan</Text>
                    <Text style={styles.location}>Hamilton and Ashland</Text>
                    <Text style={styles.info}>Member since 2020</Text>
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
        backgroundColor: '#1B9E9E',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 32,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 16,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    location: {
        fontSize: 16,
        color: '#999',
        marginTop: 8,
    },
    info: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
});

export default ProfileScreen;
