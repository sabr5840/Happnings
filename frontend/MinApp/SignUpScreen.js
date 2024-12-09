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

const SignUpScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await response.json();
      if (response.status === 201) {
        console.log('Signup success:', json);
        Alert.alert('Signup Success', 'User registered successfully');
        navigation.navigate('Login');
      } else {
        Alert.alert('Signup Failed', json.message);
      }
    } catch (error) {
      Alert.alert('Network Error', 'Unable to connect to server');
      console.error('Signup error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Sign Up</Text>
      <View style={styles.inputBlock}>
        <View style={styles.inputIconRow}>
          <Icon name="id-card" size={22} color="#000" />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#aaa"
            onChangeText={setName}
            value={name}
          />
        </View>
        <View style={styles.inputLine} />
      </View>
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
      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>
          Already registered?
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Log in here</Text>
        </TouchableOpacity>
      </View>
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
    marginTop: 30,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#808080',
    alignSelf: 'flex-start',
    marginLeft: 15,
    marginTop: -30,
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
  loginContainer: {
    marginTop: 20,
    alignItems: 'center',
    marginBottom: 240,
  },
  loginText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#555',
  },
  loginLink: {
    color: '#808080',
    fontWeight: 'bold',
    marginTop: 10,
    fontSize: 17,
  },
});

export default SignUpScreen;
