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
  StyleSheet,
  TextInput, 
  Modal
} from 'react-native';
import * as Location from 'expo-location';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart, faUser, faMagnifyingGlass, faFilter, faSort, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '@env';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker'; 
import Slider from '@react-native-community/slider';
import { Calendar } from 'react-native-calendars';
import { BlurView } from '@react-native-community/blur';


library.add(fas);

const HomeScreen = ({ navigation, route }) => {
  const [location, setLocation] = useState(null);
  const [sameDayEvents, setSameDayEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [customDistanceKm, setCustomDistanceKm] = useState(''); 
  const [currentRadiusKm, setCurrentRadiusKm] = useState(40);  
  const [distance, setDistance] = useState(40); 
  const [showSlider, setShowSlider] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [customEvents, setCustomEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // Dato bruges til at hente events efter 'Apply'
  const [chosenDate, setChosenDate] = useState(null);    // Midlertidig dato valgt i kalenderen

  // Opdater din 'Distance' knap event handler
  const toggleSliderVisibility = () => {
    setShowSlider(!showSlider);
  };

  // Tilføj funktion til at nulstille afstanden
  const resetDistance = () => {
    setDistance(40);  // Reset til standardværdi
    setCurrentRadiusKm(40); // Opdater også den aktuelle radius
  };
  
  useEffect(() => {
    // Hvis route.params.selectedCategories er defineret, opdater state
    if (route.params?.selectedCategories) {
      setSelectedCategories(route.params.selectedCategories);
    }
  }, [route.params?.selectedCategories]);

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
      if (!selectedDate) {
        // Ingen specifik dato: hent sameDay og upcoming
        fetchEvents('sameDay');
        fetchEvents('upcoming');
      } else {
        // Hvis specifik dato valgt
        fetchEvents(selectedDate); 
      }
    }
  }, [location, selectedCategories, currentRadiusKm, selectedDate]);

  const fetchEvents = async (eventDate) => {
    if (!location?.coords) {
      console.log("Location data is not available yet.");
      return;
    }

    const { latitude, longitude } = location.coords;
    let queryParams = `latitude=${latitude}&longitude=${longitude}&eventDate=${eventDate}`;

    if (selectedCategories.length > 0) {
      const categoryString = selectedCategories.join(',');
      queryParams += `&categories=${encodeURIComponent(categoryString)}`;
    }

    if (currentRadiusKm) {
      const km = parseFloat(currentRadiusKm);
      if (!isNaN(km)) {
        const miles = km / 1.60934; 
        queryParams += `&radius=${Math.floor(miles)}`;
      }
    }

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
        throw new Error(`HTTP error! status: ${response.status} - ${data.message}`);
      }

      if (eventDate === 'sameDay') {
        setSameDayEvents(data);
      } else if (eventDate === 'upcoming') {
        setUpcomingEvents(data);
      } else {
        // Hvis eventDate er en valgt dato i YYYY-MM-DD format
        setCustomEvents(data);
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
  
  const handleSetDistance = () => {
    if (!customDistanceKm || isNaN(parseFloat(customDistanceKm))) {
      Alert.alert("Invalid input", "Please enter a valid distance in km.");
      return;
    }
    setCurrentRadiusKm(customDistanceKm); // sæt den valgte radius
  };

  const formattedSelectedDate = selectedDate 
  ? format(new Date(selectedDate), "EEEE do MMMM yyyy") 
  : null;


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Kalender Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Calendar
              onDayPress={(day) => setChosenDate(day.dateString)}
              markedDates={chosenDate ? { [chosenDate]: { selected: true, selectedColor: 'blue' } } : {}}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.applyButton} onPress={() => {
                setShowCalendarModal(false);
                if (chosenDate) setSelectedDate(chosenDate);
              }}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowCalendarModal(false)}>
                <Text style={styles.applyButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Account')}>
          <FontAwesomeIcon icon={faUser} size={20} />
        </TouchableOpacity>
        <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
        <TouchableOpacity onPress={() => navigation.navigate('FavoriteList')}>
          <FontAwesomeIcon icon={faHeart} size={20} />
        </TouchableOpacity>
      </View>
  
      {/* Conditional Rendering of Search Bar and Slider */}
      {!showSlider ? (
        <View style={styles.searchBar}>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <TextInput
            style={{ flex: 1, marginLeft: 10 }}
            placeholder="Search for event, location etc..."
            onChangeText={(text) => console.log('Search:', text)}
          />
        </View>
      ) : (
        <View style={{ width: '85%', alignSelf: 'center', marginTop: 10 }}>
          <Text style={{ alignSelf: 'center', marginTop: -45 }}></Text>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={distance}
            onValueChange={(value) => setDistance(value)}
            onSlidingComplete={(value) => setCurrentRadiusKm(value)}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 145 }}>
            <Text>{distance} km</Text>
          </View>
        </View>
      )}
  
      {/* Filtre og Distancer */}
      <View style={styles.iconTray}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Category', { selectedCategories })}>
          <FontAwesomeIcon icon={faFilter} size={16} />
          <Text style={styles.buttonText}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={toggleSliderVisibility}>
          <Image source={require('./assets/distanceIcon.png')} style={styles.disIon} />
          <Text style={styles.buttonText}>Distance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setShowCalendarModal(true)}>
          <FontAwesomeIcon icon={faCalendarDays} size={16} />
          <Text style={styles.buttonText}>Calendar</Text>
        </TouchableOpacity>
      </View>
  
      {/* Events Sektion */}
      <View style={styles.section}>
        {selectedDate ? (
          <>
            <Text style={styles.sectionTitle}>Events on {formattedSelectedDate}</Text>
            {customEvents.length > 0 ? (
              <FlatList
                data={customEvents}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderEventCard}
              />
            ) : (
              <Text style={styles.noEventsText}>No events found for {selectedDate}.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Nearby events today</Text>
            {sameDayEvents.length > 0 ? (
              <FlatList
                data={sameDayEvents}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderEventCard}
              />
            ) : (
              <Text style={styles.noEventsText}>No events found for today.</Text>
            )}
  
            <Text style={styles.sectionTitle}>Upcoming events</Text>
            {upcomingEvents.length > 0 ? (
              <FlatList
                data={upcomingEvents}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderEventCard}
              />
            ) : (
              <Text style={styles.noEventsText}>No upcoming events found.</Text>
            )}
          </>
        )}
      </View>
  
      {/* Opdater placering */}
      <Button
        title="Update location"
        onPress={async () => {
          let currentLocation = await Location.getCurrentPositionAsync({});
          setLocation(currentLocation);
          if (!selectedDate) {
            fetchEvents('sameDay');
            fetchEvents('upcoming');
          } else {
            fetchEvents(selectedDate);
          }
        }}
      />
    </SafeAreaView>
  );
  
  
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  slider: {
    width: 200, 
    height: 40, 
    alignSelf: 'center',
  },
  buttonText: {
    marginLeft: 3,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
    // Modal styling
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%', 
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20
  },  
  header: {
    marginTop: -68,
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
  applyButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 10
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',

  },
  closeButton: {
    backgroundColor: '#999',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 100
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
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
    borderRadius: 8,
    marginLeft: 29
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
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5
  },
  distanceInput: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 10,
    width: 80,
    height: 35,
    marginRight: 5
  },
  logoutButton: {
    marginTop: 20,
  },
  section: {
    marginBottom: 180,
    paddingLeft: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 7,
    marginTop: 10
  },
  card: {
    minHeight: 249,  
    maxHeight: 250,
    minWidth: 299,  
    maxWidth: 300,
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