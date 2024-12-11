import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faLocationDot, faRightFromBracket, faTrash, faHeart } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '@env';

const AccountScreen = ({ navigation }) => {
  const [userId, setUserId] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    // Fetch the user's ID and token from AsyncStorage
    const fetchUserData = async () => {
      const id = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('authToken');
      setUserId(id);
      setAuthToken(token);
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        console.log('Logout successful');
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Confirm Account Deletion",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", onPress: () => console.log("Account deletion cancelled."), style: "cancel" },
        { text: "Delete", onPress: performDeleteAccount, style: "destructive" }
      ],
      { cancelable: false }
    );
  };

  const performDeleteAccount = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
      });
      if (response.ok) {
        console.log('Account successfully deleted');
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: 'SignUp' }] });
      } else {
        console.error('Failed to delete account');
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <FontAwesomeIcon icon={faUser} style={styles.topIcon} size={20} />
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
          </TouchableOpacity>
          <FontAwesomeIcon icon={faHeart} style={styles.topIcon} size={20} />
        </View>
        <Text style={styles.headerText}>Hej Sabrina</Text>
        <Text style={styles.subHeader}>Your account</Text>
        <TouchableOpacity style={styles.item} onPress={() => console.log('Personal Information')}>
          <FontAwesomeIcon icon={faUser} size={20} style={styles.icon} />
          <Text style={styles.itemText}>Personal information</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => console.log('Address')}>
          <FontAwesomeIcon icon={faLocationDot} size={20} style={styles.icon} />
          <Text style={styles.itemText}>Address</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={handleLogout}>
          <FontAwesomeIcon icon={faRightFromBracket} size={20} style={styles.icon} />
          <Text style={styles.itemText}>Log out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={handleDeleteAccount}>
          <FontAwesomeIcon icon={faTrash} size={20} style={styles.icon} />
          <Text style={styles.itemText}>Delete account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 50,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  subHeader: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  itemText: {
    fontSize: 16,
  },
  topIcon: {
    color: '#000',
    marginHorizontal: 10,
  },
});

export default AccountScreen;
