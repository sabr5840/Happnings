import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart, faUser, faMagnifyingGlass, faFilter, faSort, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

library.add(fas, far);

const favorites = [
  {
    eventId: '1',
    title: 'Color Run Marathon',
    date: '13. Dec - 19:30',
    distance: '15 km from you',
    price: '250 DKK',
    image: require('./assets/dummyPic.jpeg'),
  },
  {
    eventId: '2',
    title: 'Roskilde Festival',
    date: '4. Aug - 10:00',
    distance: '45 km from you',
    price: '800 DKK',
    image: require('./assets/concertDummyPic.jpg'),
  },
  {
    eventId: '3',
    title: 'HUI Banko',
    date: '23. Aug - 19:00',
    distance: '30 km from you',
    price: '150 DKK',
    image: require('./assets/dummypic4.avif'),
  },
  {
    eventId: '4',
    title: 'Tech Conference',
    date: '22. Sept - 09:00',
    distance: '60 km from you',
    price: '1200 DKK',
    image: require('./assets/dummypic3.jpg'),
  },
];

const HomeScreen = ({ navigation }) => {

  const renderEventCard = ({ item }) => (
    <View style={styles.card}>
      <Image source={item.image} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.cardDetails}>
          <Text style={styles.cardDetailText}>📅 {item.date}</Text>
          <Text style={styles.cardDetailText}>📍 {item.distance}</Text>
          <Text style={styles.cardDetailText}>💰 {item.price}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Account')}>
          <FontAwesomeIcon icon={faUser} style={styles.topIcon} size={20} />
        </TouchableOpacity>
          <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
          <TouchableOpacity onPress={() => navigation.navigate('FavoriteList')}>
          <FontAwesomeIcon icon={faHeart} style={styles.topIcon} size={20} />
        </TouchableOpacity>
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
      </View>


      <View style={styles.section}>
        <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nearby events</Text>
        <TouchableOpacity onPress={() => console.log('See more nearby events')}>
          <Text style={styles.seeMore}>See more</Text>
        </TouchableOpacity>
       </View>
       <FlatList
        data={favorites.slice(0, 2)} // Kun de to første
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.eventId}
        renderItem={renderEventCard}
          />
        </View>


        <View style={styles.section}>
          <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming events</Text>
          <TouchableOpacity onPress={() => console.log('See more Upcoming events')}>
            <Text style={styles.seeMore}>See more</Text>
          </TouchableOpacity>
          </View>
          <FlatList
            data={favorites.slice(2)} // De sidste to
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.eventId}
            renderItem={renderEventCard}
          />
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
    paddingHorizontal: 20,  
    width: '100%',
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  searchBar: {
    marginBottom: 20,
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
    paddingVertical: 7, // Mindre højde
    paddingHorizontal: 10, // Bevar bredde
    borderRadius: 8,
    marginTop: 7,
    marginBottom: 7

  },
  logoutButton: {
    marginTop: 20,
  },
  section: {
    marginBottom: 10,
    paddingLeft: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 7,
    marginTop: 10
  },
  card: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDetails: {
    marginTop: 5,
  },
  cardDetailText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 5
  },
  seeMore: {
    fontSize: 14,
    color: ' #D3D3D3',
    marginRight: 35,
    fontWeight: 'bold',
    marginTop: 5
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 30, 
  },
});

export default HomeScreen;
