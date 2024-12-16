import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHeart } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '@env';

// Global cache til kategorier
let cachedCategories = null;

const CategoryScreen = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ikoner til kategorier
  const categoryIcons = {
    Miscellaneous: '🎭 🎡 🍽️ 🎲',
    Sports: '🏅 ⚽ 🚴 🤼',
    Music: '🎵 🎸 🎤 🎧',
    'Arts & Theatre': '🎨 🩰 🎪 🎭',
    Film: '🎥 🍿 🌌 😂',
  };

  useEffect(() => {
    // Tjek om kategorier allerede er cached
    if (cachedCategories) {
      console.log('Bruger cached kategorier');
      setCategories(cachedCategories);
      setLoading(false);
    } else {
      fetchCategories();
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      // Filtrer "Undefined" og flyt "Miscellaneous" til sidst
      const filteredCategories = data
        .filter((category) => category.name !== 'Undefined') // Fjern "Undefined"
        .sort((a, b) => (a.name === 'Miscellaneous' ? 1 : b.name === 'Miscellaneous' ? -1 : 0)); // Flyt "Miscellaneous"

      cachedCategories = filteredCategories; // Gem kategorier i global cache
      setCategories(filteredCategories);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCategory = ({ item }) => {
    const icon = categoryIcons[item.name] || ''; // Tilføj emojis, fallback til tom string
    return (
      <TouchableOpacity style={styles.categoryCard}>
        <Text style={styles.categoryText}>
          {item.name} {icon}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Account')}>
          <FontAwesomeIcon icon={faUser} size={20} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={require('./assets/Logo_no_background.png')} style={styles.logo} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('FavoriteList')}>
          <FontAwesomeIcon icon={faHeart} size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <Text style={styles.title}>Categories</Text>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategory}
        />
      </View>

      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={() => console.log('Apply categories')}>
          <Text style={styles.buttonText}>Apply</Text>
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
  header: {
    marginTop: -50,
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
  section: {
    flex: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  categoryCard: {
    padding: 15,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#cccccc',
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 5,
    borderRadius: 8,
  },
  applyButton: {
    flex: 1,
    backgroundColor: 'black',
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 5,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CategoryScreen;
