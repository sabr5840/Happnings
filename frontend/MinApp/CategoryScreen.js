import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHeart } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '@env';

// Global cache for categories to avoid refetching
let cachedCategories = null;

const CategoryScreen = ({ navigation, route }) => {
  const [categories, setCategories] = useState([]); // State to store fetched categories
  const [loading, setLoading] = useState(true); // State to manage loading indicator

  // Retrieve selected categories from route.params, if provided
  const initiallySelected = route.params?.selectedCategories || [];
  const [selectedCategories, setSelectedCategories] = useState(initiallySelected);

  // Icons for specific category names
  const categoryIcons = {
    Miscellaneous: '🎭 🎡 🍽️ 🎲',
    Sports: '🏅 ⚽ 🚴 🤼',
    Music: '🎵 🎸 🎤 🎧',
    'Arts & Theatre': '🎨 🩰 🎪 🎭',
    Film: '🎥 🍿 🌌 😂',
  };

  // Function to reset selected categories
  const resetCategories = () => {
    setSelectedCategories([]); // Clears the selected categories
  };

  // Fetch categories on component mount
  useEffect(() => {
    if (cachedCategories) {

      // Use cached data if available
      setCategories(cachedCategories);
      setLoading(false);
    } else {
      fetchCategories(); // Fetch categories from API if not cached
    }
  }, []);

  // Fetch categories from the API
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      // Filter out undefined categories and sort Miscellaneous to the end
      const filteredCategories = data
        .filter((category) => category.name !== 'Undefined')
        .sort((a, b) => (a.name === 'Miscellaneous' ? 1 : b.name === 'Miscellaneous' ? -1 : 0));

      cachedCategories = filteredCategories; // Cache the fetched categories
      setCategories(filteredCategories); // Update state with categories
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    } finally {
      setLoading(false); // Stop loading spinner
    }
  };

  // Toggle category selection
  const toggleCategory = (categoryName) => {
    setSelectedCategories(prevSelected => {

      // Add or remove category from the selected list
      if (prevSelected.includes(categoryName)) {
        return prevSelected.filter(c => c !== categoryName);
      } else {
        return [...prevSelected, categoryName];
      }
    });
  };

  // Render each category item in the FlatList
  const renderCategory = ({ item }) => {
    const icon = categoryIcons[item.name] || ''; // Get icon for the category
    const isSelected = selectedCategories.includes(item.name);  // Check if the category is selected
    return (
      <TouchableOpacity 
        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
        onPress={() => toggleCategory(item.name)}
      >
        <Text style={styles.categoryText}>
          {item.name} {icon}
        </Text>
      </TouchableOpacity>
    );
  };

  // Display loading spinner while categories are being fetched
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  // Handle apply button press
  const handleApply = () => {
    if (selectedCategories.length === 0) {

      // Show alert if no categories are selected
      Alert.alert(
        "No Categories Selected",
        "Please select at least one category before applying.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Navigate back to the Home screen with selected categories
    navigation.navigate('Home', { selectedCategories });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

      <View style={styles.resetButtonContainer}>
        <TouchableOpacity style={styles.resetButton} onPress={resetCategories}>
          <Text style={styles.buttonTextRe}>Reset Categories</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Categories</Text>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategory}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
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
  resetButtonContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  resetButton: {
    padding: 10,
    borderRadius: 5,
    marginTop: -25
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
  categoryCardSelected: {
    backgroundColor: '#b0cbe8', 
    borderColor: '#b0cbe8',
  },
  buttonTextRe: {
    color: 'gray',
    fontWeight: 'bold',
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
