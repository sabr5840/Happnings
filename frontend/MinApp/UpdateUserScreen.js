import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHeart } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '@env';

const UpdateUserScreen = ({ navigation }) => {

  // State variables to store user data and loading status
  const [userId, setUserId] = useState(null); // User ID retrieved from AsyncStorage
  const [authToken, setAuthToken] = useState(null); // Auth token retrieved from AsyncStorage
  const [updatedName, setUpdatedName] = useState(''); // User's updated name
  const [updatedEmail, setUpdatedEmail] = useState(''); // User's updated email
  const [updatedPassword, setUpdatedPassword] = useState('**********'); // Default password shown as "****"
  const [loading, setLoading] = useState(false); // Loading state for API calls

  // Fetch user data from AsyncStorage on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const id = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('authToken');
      setUserId(id);
      setAuthToken(token);

      if (id && token) {
        fetchUserDetails(id, token); // Fetch user details if ID and token are available
      }
    };

    fetchUserData();
  }, []);


  // Function to fetch user details from the server
  const fetchUserDetails = async (id, token) => {
    try {
      setLoading(true); // Show loading indicator
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await response.json();

      if (response.ok) {
        
        // Populate the state with the fetched user details
        setUpdatedName(json.Name || '');
        setUpdatedEmail(json.Email || '');
      } else {
        console.error('Failed to fetch user details:', json.message);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

    // Function to handle updating the user's information
  const handleUpdateUser = async () => {
    
    // Validate email and password inputs
    if (!updatedEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    if (updatedPassword !== '****' && updatedPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true); // Show loading indicator
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...(updatedName && { name: updatedName }),
          ...(updatedEmail && { email: updatedEmail }),
          ...(updatedPassword !== '****' && { password: updatedPassword }),
        }),
      });

      const json = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Your information has been updated successfully.');
        navigation.goBack();  // Navigate back after successful update
      } else {
        Alert.alert('Error', json.message || 'Failed to update information.');
      }
    } catch (error) {
      console.error('Update user error:', error);
      Alert.alert('Error', 'Network error occurred.');
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <View style={styles.container}>
        <View style={styles.header}>
          <FontAwesomeIcon icon={faUser} style={styles.topIcon} size={20} />
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
          </TouchableOpacity>
          <FontAwesomeIcon icon={faHeart} style={styles.topIcon} size={20} />
        </View>

        <Text style={styles.title}>Update User Information</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={updatedName}
          onChangeText={setUpdatedName}
          placeholder="Enter your name"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={updatedEmail}
          onChangeText={setUpdatedEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry={true}
          value={updatedPassword}
          onChangeText={(text) => setUpdatedPassword(text === '**********' ? '' : text)} // Reset to empty if modified
          placeholder="Enter a new password"
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleUpdateUser}>
            <Text style={styles.buttonText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 5,
    marginBottom: 5,
    marginTop: -87
  },
  topIcon: {
    color: '#000',
    marginHorizontal: 10,
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: -40,
    marginLeft: 17
  },
  label: {
    fontSize: 16,
    marginBottom: 9,
    marginLeft: 17
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 15,
    marginBottom: 20,
    marginLeft: 17,
    marginRight: 15
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#cccccc',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 40,
    marginTop: 15,
    marginLeft: 17

  },
  cancelButton: {
    backgroundColor: '#ccc',
    marginRight: 15
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default UpdateUserScreen;
