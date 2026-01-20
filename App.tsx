import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Calendar, Trophy, Wine, User } from 'lucide-react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Login from './components/login/login';

// Screen Imports
import HomeScreen from './components/screens/home';
import ScheduleScreen from './components/screens/schedule';
import TournamentsScreen from './components/screens/tournament';
import ClubhouseScreen from './components/screens/clubhouse';
import ProfileScreen from './components/screens/profile';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let icon;

          if (route.name === 'Home') {
            icon = <Home size={size} color={color} />;
          } else if (route.name === 'Schedule') {
            icon = <Calendar size={size} color={color} />;
          } else if (route.name === 'Tournaments') {
            icon = <Trophy size={size} color={color} />;
          } else if (route.name === 'Clubhouse') {
            icon = <Wine size={size} color={color} />;
          } else if (route.name === 'Profile') {
            icon = <User size={size} color={color} />;
          }

          return icon;
        },
        tabBarActiveTintColor: '#1B9E9E',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e5e5',
          paddingBottom: 10,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 5,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: 'Schedule' }}
      />
      <Tab.Screen
        name="Tournaments"
        component={TournamentsScreen}
        options={{ title: 'Tournaments' }}
      />
      <Tab.Screen
        name="Clubhouse"
        component={ClubhouseScreen}
        options={{ title: 'Clubhouse' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E8B57" />
      </View>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HomeTabs" component={HomeTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;

