import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart, faUser } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated } from 'react-native';


const FavoriteListScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  // Funktion til at hente favoritter fra backend
  const fetchFavorites = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('User token is missing');

      const response = await fetch(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch favorites');

      setFavorites(data);
    } catch (error) {
      console.error('Error fetching favorites:', error.message);
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  // Funktion til at slette en favorit
  const deleteFavorite = (favoriteId) => {
    const fadeAnim = new Animated.Value(1);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start(async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) throw new Error('User token is missing');

        const response = await fetch(`${API_URL}/api/favorites/${favoriteId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to delete favorite');

        setFavorites((prevFavorites) => prevFavorites.filter((fav) => fav.eventId !== favoriteId));
      } catch (error) {
        console.error('Error deleting favorite:', error.message);
      }
    });

    return fadeAnim;
  };

  // Render en favorit-event
  const renderFavoriteItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('EventDetail', { eventId: item.eventId })}
        style={styles.cardContainer}
      >
        <View style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <TouchableOpacity
            style={styles.heartIcon}
            onPress={() => deleteFavorite(item.eventId)}
            disabled={item.isDeleting}
          >
            <FontAwesomeIcon icon={faHeart} size={20} color={item.isDeleting ? 'grey' : 'red'} />
          </TouchableOpacity>
          <View style={styles.infoContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.detailRow}>
              <Text>📅</Text>
              <Text>{item.date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text>🕗</Text>
              <Text>{item.time}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text>💰</Text>
              <Text>{item.price}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text>📍</Text>
              <Text>{item.venueAddress}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <Text>Loading favorites...</Text>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Account')}>
          <FontAwesomeIcon icon={faUser} size={20} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('FavoriteList')}>
          <FontAwesomeIcon icon={faHeart} size={20} />
        </TouchableOpacity>
      </View>

      <Text style={styles.heading}>Favorite Events Saved</Text>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.eventId}
        renderItem={renderFavoriteItem}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: -30,
    marginTop: -65,
  },
  logo: {
    width: 210,
    height: 210,
    resizeMode: 'contain',
  },
  topIcon: {
    color: '#000',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    marginTop: -30,
    marginBottom: 10,
  },
  listContainer: {
    padding: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    width: '95%',
    maxWidth: 350,
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  heartIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 5,
    elevation: 3,
  },
  infoContainer: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    fontSize: 16,
    marginRight: 5,
  },
  detail: {
    fontSize: 14,
    color: '#555',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    color: '#999',
  },
});

export default FavoriteListScreen;
