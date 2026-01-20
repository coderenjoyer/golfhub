import React from 'react';
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    ScrollView,
} from 'react-native';

const HomeScreen: React.FC = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Home</Text>
                </View>
                <View style={styles.content}>
                    <Text style={styles.comingSoon}>Welcome to GolfHub Home</Text>
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
    comingSoon: {
        fontSize: 16,
        color: '#999',
    },
});

export default HomeScreen;
