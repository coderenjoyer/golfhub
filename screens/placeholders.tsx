import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ name }: { name: string }) => (
    <View style={styles.container}>
        <Text style={styles.text}>{name} Screen</Text>
        <Text style={styles.subText}>Coming Soon</Text>
    </View>
);

export const HomeScreen = () => <PlaceholderScreen name="Home" />;
export const ScheduleScreen = () => <PlaceholderScreen name="Schedule" />;
export const TournamentsScreen = () => <PlaceholderScreen name="Tournaments" />;
export const ClubhouseScreen = () => <PlaceholderScreen name="Clubhouse" />;
export const ProfileScreen = () => <PlaceholderScreen name="Profile" />;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subText: {
        fontSize: 16,
        color: '#666',
    },
});
