import React from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHeart, faUser } from '@fortawesome/free-solid-svg-icons';

const FavoriteListScreen = ({ navigation }) => {
  // Dummy data
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
  ];

  const renderFavoriteItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={item.image} style={styles.image} />
      <TouchableOpacity style={styles.heartIcon}>
        <FontAwesomeIcon icon={faHeart} size={20} color="black" />
      </TouchableOpacity>
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.detailRow}>
          <Text style={styles.icon}>📅</Text>
          <Text style={styles.detail}>{item.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.icon}>📍</Text>
          <Text style={styles.detail}>{item.distance}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.icon}>💰</Text>
          <Text style={styles.detail}>{item.price}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Account')}>
          <FontAwesomeIcon icon={faUser} style={styles.topIcon} size={20} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('FavoriteList')}>
          <FontAwesomeIcon icon={faHeart} style={styles.topIcon} size={20} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.heading}>Favorite Events Saved</Text>

      {/* Favorites List */}
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.eventId}
        renderItem={renderFavoriteItem}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    padding: 10,
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
    marginBottom: 10
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
});

export default FavoriteListScreen;
