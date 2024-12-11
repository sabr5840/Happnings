import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; 
import { API_URL } from '@env'; // Importer API_URL fra dine miljøvariabler
import AsyncStorage from '@react-native-async-storage/async-storage';  // Tilføj dette import


const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const json = await response.json();
      if (response.status === 200) {
        console.log('Login success:', json);
        await AsyncStorage.setItem('userId', json.userId);  // Gem brugerens ID
        await AsyncStorage.setItem('authToken', json.token);  // Gem brugerens token
        navigation.navigate('Home');
      } else {
        Alert.alert('Login Failed', json.message);
      }
    } catch (error) {
      Alert.alert('Network Error', 'Unable to connect to server');
      console.error('Login error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Log in</Text>
      <View style={styles.inputBlock}>
        <View style={styles.inputIconRow}>
          <Icon name="user" size={22} color="#000" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            onChangeText={setEmail}
            value={email}
          />
        </View>
        <View style={styles.inputLine} />
      </View>
      <View style={styles.inputBlock}>
        <View style={styles.inputIconRow}>
          <Icon name="lock" size={22} color="#000" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            onChangeText={setPassword}
            value={password}
          />
        </View>
        <View style={styles.inputLine} />
      </View>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log in</Text>
      </TouchableOpacity>
      <Text style={styles.signupText}>
        Not registered yet?
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.signupLink}>Sign up now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: 10,
    marginTop: -220,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#808080',
    alignSelf: 'flex-start',
    marginLeft: 15,
  },
  inputBlock: {
    width: '90%',
    marginBottom: 15,
  },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    height: 50,
    fontSize: 20,
    color: 'black',
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inputLine: {
    height: 2,
    backgroundColor: 'black',
    width: '100%',
  },
  button: {
    backgroundColor: '#cccccc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 17,
    width: '40%',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  buttonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: '600',
  },
  signupText: {
    fontWeight: 'bold',
    marginTop: 20,
    fontSize: 18,
    color: '#555',
  },
  signupLink: {
    color: '#808080',
    fontWeight: 'bold',
    marginTop: 10,
    fontSize: 17,
  },
});

export default LoginScreen;
