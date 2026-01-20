import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

// Removed local COLORS definition in favor of unified constant

import { Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');

    const toggleSwitch = (login: boolean) => {
        setIsLogin(login);
        Animated.timing(slideAnim, {
            toValue: login ? 0 : 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert("Required", "Please enter your email address to reset your password.");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            Alert.alert("Success", "Password reset instructions have been sent to your email.");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        setLoading(true);
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const isMegaAdmin = firstName.trim() === 'Mega' && lastName.trim() === 'Admin';

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            phone: phone,
                            role: isMegaAdmin ? 'admin' : 'user', // Automatically assign role based on name
                        },
                    },
                });
                if (error) throw error;
                Alert.alert('Success', 'Please check your inbox for email verification!');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Decorative Header Background */}
            <View style={styles.headerBackground}>
                <View style={styles.circle1} />
                <View style={styles.circle2} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>GolfHub</Text>
                        <Text style={styles.subtitle}>Find your perfect golf buddy.</Text>
                    </View>

                    {/* Slide Toggle */}
                    <View style={styles.toggleContainer}>
                        <Animated.View
                            style={[
                                styles.slideBackground,
                                {
                                    left: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['1%', '50%'],
                                    }),
                                },
                            ]}
                        />
                        <TouchableOpacity style={styles.toggleButton} onPress={() => toggleSwitch(true)}>
                            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.toggleButton} onPress={() => toggleSwitch(false)}>
                            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form Container */}
                    <View style={styles.formContainer}>

                        {!isLogin && (
                            <>
                                <View style={styles.row}>
                                    <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.label}>First Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Tiger"
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            placeholderTextColor="#999"
                                        />
                                    </View>
                                    <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                                        <Text style={styles.label}>Last Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Woods"
                                            value={lastName}
                                            onChangeText={setLastName}
                                            placeholderTextColor="#999"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Phone Number</Text>
                                    <View style={styles.phoneInputContainer}>
                                        <Text style={styles.phonePrefix}>+63</Text>
                                        <TextInput
                                            style={styles.phoneInput}
                                            placeholder="917 123 4567"
                                            value={phone}
                                            onChangeText={setPhone}
                                            keyboardType="phone-pad"
                                            placeholderTextColor="#999"
                                            maxLength={10}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="golfer@example.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                placeholderTextColor="#999"
                            />
                        </View>

                        {isLogin && (
                            <TouchableOpacity style={styles.forgotPass} onPress={handleForgotPassword} disabled={loading}>
                                <Text style={styles.forgotPassText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.mainButton} onPress={handleAction} disabled={loading}>
                            <Text style={styles.mainButtonText}>
                                {loading ? 'Loading...' : (isLogin ? 'Login' : 'Create Account')}
                            </Text>
                        </TouchableOpacity>


                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.gray,
    },
    headerBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: COLORS.primary,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    circle1: {
        position: 'absolute',
        top: -50,
        left: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: COLORS.lightBlue,
        opacity: 0.2,
    },
    circle2: {
        position: 'absolute',
        top: 50,
        right: -30,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: COLORS.dark,
        opacity: 0.2,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 80,
        paddingBottom: 40,
        alignItems: 'center',
    },
    headerContainer: {
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: COLORS.white,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.lightBlue,
        marginTop: 5,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 30,
        width: '100%',
        maxWidth: 400,
        height: 50,
        marginBottom: 30,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    slideBackground: {
        position: 'absolute',
        top: 2,
        bottom: 2,
        width: '49%',
        backgroundColor: COLORS.white,
        borderRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    toggleButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#DDD', // Inactive color on green bg
    },
    toggleTextActive: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    inputContainer: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 6,
        marginLeft: 4,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 15,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        overflow: 'hidden',
    },
    phonePrefix: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.text,
        backgroundColor: '#f0f0f0',
        borderRightWidth: 1,
        borderRightColor: '#EEEEEE',
        fontWeight: '500',
    },
    phoneInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 15,
        fontSize: 16,
        color: COLORS.text,
    },
    forgotPass: {
        alignSelf: 'flex-end',
        marginBottom: 20,
    },
    forgotPassText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    mainButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginTop: 10,
    },
    mainButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
