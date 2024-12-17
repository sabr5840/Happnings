import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faHeart } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '@env';

// Global cache til kategorier
let cachedCategories = null;

const CategoryScreen = ({ navigation, route }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Her henter vi evt. allerede valgte kategorier fra route.params (hvis Home sendte dem)
  const initiallySelected = route.params?.selectedCategories || [];
  const [selectedCategories, setSelectedCategories] = useState(initiallySelected);

  const categoryIcons = {
    Miscellaneous: '🎭 🎡 🍽️ 🎲',
    Sports: '🏅 ⚽ 🚴 🤼',
    Music: '🎵 🎸 🎤 🎧',
    'Arts & Theatre': '🎨 🩰 🎪 🎭',
    Film: '🎥 🍿 🌌 😂',
  };

  useEffect(() => {
    if (cachedCategories) {
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

      const filteredCategories = data
        .filter((category) => category.name !== 'Undefined')
        .sort((a, b) => (a.name === 'Miscellaneous' ? 1 : b.name === 'Miscellaneous' ? -1 : 0));

      cachedCategories = filteredCategories;
      setCategories(filteredCategories);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName) => {
    // Hvis kategorien allerede er valgt, fjern den. Ellers tilføj den.
    setSelectedCategories(prevSelected => {
      if (prevSelected.includes(categoryName)) {
        return prevSelected.filter(c => c !== categoryName);
      } else {
        return [...prevSelected, categoryName];
      }
    });
  };

  const renderCategory = ({ item }) => {
    const icon = categoryIcons[item.name] || '';
    const isSelected = selectedCategories.includes(item.name);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  const handleApply = () => {
    if (selectedCategories.length === 0) {
      Alert.alert(
        "No Categories Selected",
        "Please select at least one category before applying.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Naviger tilbage til Home og send de valgte kategorier med
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
    backgroundColor: '#b0cbe8', // Grønlig baggrund for at indikere valgt
    borderColor: '#b0cbe8',
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
