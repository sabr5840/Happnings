import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  Button,
  StyleSheet
} from 'react-native';
import * as Location from 'expo-location';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart, faUser, faMagnifyingGlass, faFilter, faSort, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '@env';
import { format } from 'date-fns';


library.add(fas);

const HomeScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [sameDayEvents, setSameDayEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    const getLocationAsync = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Permission to access location was denied');
        return;
      }

      let locationSubscription = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 1,
      }, (newLocation) => {
        setLocation(newLocation);
      });

      return () => locationSubscription.remove();
    };

    getLocationAsync();
  }, []);

  useEffect(() => {
    if (location?.coords) {
      fetchEvents('sameDay');
      fetchEvents('upcoming');
    }
  }, [location]);

  const fetchEvents = async (eventDate) => {
    if (!location?.coords) {
      console.log("Location data is not available yet.");
      return;
    }

    const { latitude, longitude } = location.coords;
    const queryParams = `latitude=${latitude}&longitude=${longitude}&eventDate=${eventDate}`;
    const url = `${API_URL}/api/events?${queryParams}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('HTTP Response Not OK:', response.status, response.statusText);
        console.error('Response headers:', response.headers);
        console.error('Response body:', data);
        throw new Error(`HTTP error! status: ${response.status} - ${data.message}`);
      }

      if (eventDate === 'sameDay') {
        setSameDayEvents(data);
      } else if (eventDate === 'upcoming') {
        setUpcomingEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Fetch Error', `Unable to fetch events: ${error.message}`);
    }
  };

  const renderEventCard = ({ item }) => {
    const imageUrl = item.images?.[0]?.url ?? 'default_image_url_here';
    const distanceInKm = ((item.distance ?? 0) * 1.60934).toFixed(2);
    const eventDateTime = item.dates?.start?.dateTime;
    const eventDate = eventDateTime ? new Date(eventDateTime) : new Date();
    const formattedDate = format(eventDate, 'dd. MMM yyyy');
    const formattedTime = format(eventDate, 'HH:mm');
    const priceRange = item.sales?.public?.priceRanges?.[0];
    const price = priceRange ? `${priceRange.min} - ${priceRange.max} kr.` : 'Not available';
  
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}>
        <View style={styles.card}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.cardDetails}>
              <Text style={styles.cardDetailText}>📅 {formattedDate} - {formattedTime}</Text>
              <Text style={styles.cardDetailText}>📍 {distanceInKm} km from you</Text>
              <Text style={styles.cardDetailText}>💰 {price}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Account')}>
            <FontAwesomeIcon icon={faUser} size={20} />
          </TouchableOpacity>
          <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
          <TouchableOpacity onPress={() => navigation.navigate('FavoriteList')}>
            <FontAwesomeIcon icon={faHeart} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <Text style={styles.searchText}>Search for event, location etc...</Text>
        </View>

        <View style={styles.iconTray}>
        <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Category')}
          >
            <FontAwesomeIcon icon={faFilter} size={16} />
            <Text style={styles.buttonText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <FontAwesomeIcon icon={faSort} size={16} />
            <Text style={styles.buttonText}>Sort by</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
          <Image source={require('./assets/distanceIcon.png')} style={styles.disIon} />
            <Text style={styles.buttonText}>Distance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <FontAwesomeIcon icon={faCalendarDays} size={16} />
            <Text style={styles.buttonText}>Calendar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby events today</Text>
          {sameDayEvents.length === 0 ? (
            <Text style={styles.noEventsText}>No events found for today.</Text>
          ) : (
            <FlatList
              data={sameDayEvents}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={renderEventCard}
            />
          )}

          <Text style={styles.sectionTitle}>Upcoming events</Text>
          {upcomingEvents.length === 0 ? (
            <Text style={styles.noEventsText}>No upcoming events found.</Text>
          ) : (
            <FlatList
              data={upcomingEvents}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={renderEventCard}
            />
          )}
        </View>

        <Text style={styles.text}>Your current location:</Text>
        <Text style={styles.text}>
          Latitude: {location?.coords ? location.coords.latitude : 'Loading...'} |
          Longitude: {location?.coords ? location.coords.longitude : 'Loading...'}
        </Text>
        <Button
          title="Update location"
          onPress={async () => {
            let currentLocation = await Location.getCurrentPositionAsync({});
            setLocation(currentLocation);
            fetchEvents('sameDay');
            fetchEvents('upcoming');
          }}
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
  buttonText: {
    marginLeft: 3,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  
  header: {
    marginTop: 240,
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
  disIon: {
    width: 19,
    height: 19,
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
  noEventsText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 1,
  },
  
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#000',
    borderWidth: 1,
    paddingVertical: 7, 
    paddingHorizontal: 10, 
    borderRadius: 8,
    marginTop: 7,
    marginBottom: 12

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
    height: 250,
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
},
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default HomeScreen;
