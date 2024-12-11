import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './Login';
import SignUpScreen from './SignUpScreen';
import HomeScreen from './Home'; 
import AccountScreen from './AccountScreen'; 
import UpdateUserScreen from './UpdateUserScreen';
import FavoriteListScreen from './FavoriteListScreen'; 


const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Home" component={HomeScreen} /> 
        <Stack.Screen name="Account" component={AccountScreen} /> 
        <Stack.Screen name="UpdateUser" component={UpdateUserScreen} />
        <Stack.Screen name="FavoriteList" component={FavoriteListScreen} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
}
