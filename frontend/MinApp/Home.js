import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart, faUser, faMagnifyingGlass, faFilter, faSort, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

library.add(fas, far);

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Account')}>
          <FontAwesomeIcon icon={faUser} style={styles.topIcon} size={20} />
        </TouchableOpacity>
          <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
          <FontAwesomeIcon icon={faHeart} style={styles.topIcon} size={20} />
        </View>
        <View style={styles.searchBar}>
          <FontAwesomeIcon icon="fa-solid fa-magnifying-glass" style={styles.icon} />
          <Text style={styles.searchText}>Search for event, location etc...</Text>
        </View>
        <View style={styles.iconTray}>
          <TouchableOpacity style={styles.button}>
            <FontAwesomeIcon icon={faFilter} style={styles.icon} />
            <Text>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <FontAwesomeIcon icon={faSort} style={styles.icon} />
            <Text>Sort by</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <FontAwesomeIcon icon={faCalendarDays} style={styles.icon} />
            <Text>Calendar</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.logoutButton}>
          <Text>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  header: {
    marginTop: -60,
    marginBottom: -50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,  // Tilføjer padding på siderne for at give lidt luft
    width: '100%',
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  searchBar: {
    marginBottom: 35,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderColor: '#000',
    borderWidth: 1,
    width: '85%',
    borderRadius: 8
  },
  searchText: {
    marginLeft: 10,
  },
  icon: {
    color: '#000',
    paddingHorizontal: 15,
    marginLeft: -10
  },
  topIcon: {
    color: '#000',
    marginHorizontal: 10,
  },
  iconTray: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#000',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8
  },
  logoutButton: {
    marginTop: 20,
  },
});

export default HomeScreen;
