import React from 'react';
import { COLORS } from '../../constants/colors';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TournamentsScreen: React.FC = () => {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Tournaments</Text>
                </View>
                <View style={styles.content}>
                    <Text style={styles.comingSoon}>Featured tournaments will appear here</Text>
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

export default TournamentsScreen;
