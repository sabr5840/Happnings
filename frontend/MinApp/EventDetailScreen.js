
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Linking, Image, StyleSheet, Modal, Animated } from 'react-native';
import { format, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FontAwesome } from '@expo/vector-icons';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

const EventDetailScreen = ({ navigation, route }) => {
    const { eventId } = route.params; // Extract eventId passed from the previous screen
    const [event, setEvent] = useState(null); // Store event details
    const [liked, setLiked] = useState(false); // Track like status
    const [loading, setLoading] = useState(true); // Manage loading state
    const [error, setError] = useState(null); // Track errors
    const [modalVisible, setModalVisible] = useState(false); // Modal visibility for reminders
    const scaleAnim = useRef(new Animated.Value(0)).current;  // Animation reference for modal

    // Function to handle sharing the event details
    const onShare = async () => {
        if (event) {
            const message = `🎉 Get ready for an unforgettable evening! 🎉
    
The ${event.name} takes place on ${event.date} at ${event.time}.
    
Come and experience the magic at ${event.venueAddress.address}, ${event.venueAddress.city}.
    
💰 The price is ${event.priceRange || 'not available'}, you can grab your tickets here 🎟 👉 ${event.eventUrl}
    
Hurry up – this is guaranteed to be an experience you won’t want to miss!`;
    
            try {
                await Share.share({ message }); // Share event details via native sharing
            } catch (error) {
                console.error('Error sharing', error);
                alert('Error during sharing: ' + error.message);
            }
        } else {
            alert('Cannot share, event data is not available. Please wait until the event data is fully loaded.');
        }
    };
    
    
    // Fetch event details and check if it is already liked
    useEffect(() => {
        const fetchEventDetail = async () => {
            try {
                const response = await fetch(`${API_URL}/api/events/${eventId}`);  // Fetch event data
                const data = await response.json();
                if (!response.ok) throw new Error(data.message); // Handle API errors
                setEvent(data);
                await checkIfLiked(); // Check if event is liked
            } catch (error) {
                setError(error.message); // Set error state
            } finally {
                setLoading(false); // Stop loading indicator
            }
        };

        fetchEventDetail(); // Call function on component mount
    }, [eventId]);

    // Check if the event is liked
    const checkIfLiked = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken'); // Get user token
            if (!token) return;

            const response = await fetch(`${API_URL}/api/favorites`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const favorites = await response.json();
            if (response.ok) {
                const isLiked = favorites.some((fav) => fav.eventId === eventId);  // Check if event exists in favorites
                setLiked(isLiked);
            }
        } catch (error) {
            console.error('Error checking favorite status:', error.message);
        }
    };

    // Toggle like status of the event
    const toggleLike = async () => {
        try {
            const userToken = await AsyncStorage.getItem('authToken'); // Get user token
            if (!userToken) throw new Error('User token is missing');

            const method = liked ? 'DELETE' : 'POST'; // Determine HTTP method
            const url = liked
                ? `${API_URL}/api/favorites/${eventId}`
                : `${API_URL}/api/favorites`;

            const body = liked ? null : JSON.stringify({ eventId }); // Determine HTTP method

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to update favorite');

            setLiked(!liked); // Update like state
        } catch (error) {
            console.error('Error toggling favorite:', error.message);
        }
    };

    // Handle modal animation for reminders
    useEffect(() => {
        if (modalVisible) {
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            scaleAnim.setValue(0); // Reset animation
        }
    }, [modalVisible]);


    // Render loading or error state
    if (loading) return <Text>Loading...</Text>;
    if (error) return <Text>Error: {error}</Text>;

    return (
        <View style={styles.container}>
            {event && (
                <>
                    <Image source={{ uri: event.imageUrl }} style={styles.image} />
                    <View style={styles.overlayIcons}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={[styles.iconCircle, styles.arrowIcon]}
                        >
                            <FontAwesome name="arrow-left" size={20} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={toggleLike}
                            style={[styles.iconCircle, styles.likeIcon]}
                        >
                            <FontAwesome
                                name={liked ? "heart" : "heart-o"}
                                size={20}
                                color="red"
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.detailsContainer}>
                        <View style={styles.header}>
                            <Text style={styles.name}>{event.name}</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(true)}
                                style={styles.bellIcon}
                            >
                                <FontAwesome name="bell" size={20} color="black" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.details}>
                            📅 {format(parseISO(event.date), "eeee 'the' do 'of' MMMM", { locale: enUS })}
                        </Text>
                        <Text style={styles.details}>
                            🕗 {format(parseISO(event.date + 'T' + event.time), 'HH:mm')}
                        </Text>
                        <Text style={styles.details}>
                            💰 {event.priceRange || "not available"}
                        </Text>
                        <Text style={styles.details}>
                            📍 {`${event.venueAddress.address}, ${event.venueAddress.postalCode} ${event.venueAddress.city}`}
                        </Text>
                        <View style={styles.shareContainer}>
                            <TouchableOpacity onPress={onShare} style={styles.shareIcon}>
                                <FontAwesome name="share-alt" size={20} color="#000" />
                            </TouchableOpacity>
                            <Text style={styles.shareText}>Share</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => Linking.openURL(event.eventUrl)}
                            style={styles.ticketButton}
                        >
                            <Text style={styles.ticketLink}>Buy Tickets Here</Text>
                        </TouchableOpacity>
                    </View>
                    <Modal
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <TouchableOpacity
                            style={styles.centeredView}
                            activeOpacity={1}
                            onPressOut={() => setModalVisible(false)}
                        >
                            <Animated.View
                                style={[
                                    styles.modalView,
                                    { transform: [{ scale: scaleAnim }] },
                                ]}
                            >
                                {["1 hour before", "1 day before", "2 days before", "1 week before"].map(
                                    (reminder, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.reminderButton}
                                            onPress={() => {
                                                console.log(`Selected reminder: ${reminder}`);
                                                setModalVisible(false);
                                            }}
                                        >
                                            <Text style={styles.reminderText}>{reminder}</Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </Animated.View>
                        </TouchableOpacity>
                    </Modal>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    
    shareContainer: {
        flexDirection: 'row', // Arranger ikon og tekst horisontalt
        alignItems: 'center', // Centrer elementerne vertikalt
        marginTop: 10, // Tilføj lidt topmargin for at adskille fra adresse
        marginBottom: 20, // Tilføj lidt bundmargin før købsknap
    },
    shareIcon: {
        marginRight: 10, // Afstand mellem ikon og tekst
    },
    shareText: {
        fontSize: 16, // Størrelse på teksten
        color: '#000', // Tekstfarve
    },
       
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    reminderButton: {
        padding: 10,
        elevation: 2,
        borderRadius: 10,
        marginVertical: 5,
        backgroundColor: 'rgba(204, 204, 204, 0.0)', 
    },
    bellIcon: {
        padding: 5,
    },
    reminderText: {
        color: 'black', 
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        flexWrap: 'wrap', 
    },
    modalView: {
        margin: 20,
        backgroundColor: 'rgba(204, 204, 204, 0.8)', 
        borderRadius: 20,
        padding: 10,
        width: '40%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        marginTop: 360,
        marginLeft: 225
    },
    image: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    overlayIcons: {
        position: 'absolute',
        top: 50,
        width: '100%',
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    iconCircle: {
        width: 44,
        height: 44,
        backgroundColor: 'white',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        marginLeft: 10,
    },
    likeIcon: {
        marginRight: 10,
    },
    detailsContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        paddingTop: 35,
        paddingHorizontal: 20,
        overflow: 'hidden',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
        marginTop: -5,
        flex: 1, 
        marginLeft: -20
    },
    details: {
        fontSize: 16,
        marginBottom: 5,
        color: '#333',
        marginTop: 15
    },
    ticketButton: {
        backgroundColor: 'black',
        padding: 10,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 200
    },
    ticketLink: {
        fontSize: 16,
        color: 'white',
    },
    arrowIcon: {
        paddingBottom: 1,
        paddingRight: 2,
    },

});

export default EventDetailScreen;