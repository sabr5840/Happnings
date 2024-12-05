import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const SignUpScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* App Logo */}
      <Image
        source={require('./assets/logo.png')}
        style={styles.logo}
      />

      {/* Sign Up Title */}
      <Text style={styles.title}>Sign Up</Text>

      {/* Full Name Input */}
      <View style={styles.inputBlock}>
        <View style={styles.inputIconRow}>
          <Icon name="id-card" size={22} color="#000" />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#aaa"
          />
        </View>
        <View style={styles.inputLine} />
      </View>

      {/* Email Input */}
      <View style={styles.inputBlock}>
        <View style={styles.inputIconRow}>
          <Icon name="user" size={22} color="#000" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
          />
        </View>
        <View style={styles.inputLine} />
      </View>

      {/* Password Input */}
      <View style={styles.inputBlock}>
        <View style={styles.inputIconRow}>
          <Icon name="lock" size={22} color="#000" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
          />
        </View>
        <View style={styles.inputLine} />
      </View>

      {/* Sign Up Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      {/* Login Link */}
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
