
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Linking, Image, StyleSheet, Modal, Animated } from 'react-native';
import { format, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FontAwesome } from '@expo/vector-icons';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EventDetailScreen = ({ navigation, route }) => {
    const { eventId } = route.params;
    const [event, setEvent] = useState(null);
    const [liked, setLiked] = useState(false);  
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fetchEventDetail = async () => {
            try {
                const response = await fetch(`${API_URL}/api/events/${eventId}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                setEvent(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetail();
    }, [eventId]);

    useEffect(() => {
        if (modalVisible) {
            // Trigger the animation when modal is made visible
            Animated.timing(scaleAnim, {
                toValue: 1, // Final scale
                duration: 300, // Animation duration
                useNativeDriver: true,
            }).start();
        } else {
            // Reset the animation when modal is hidden
            scaleAnim.setValue(0);
        }
    }, [modalVisible]);

    if (loading) return <Text>Loading...</Text>;
    if (error) return <Text>Error: {error}</Text>;

    const toggleLike = async () => {
        try {
            console.log('Toggling like for event:', eventId);
            if (!eventId) {
                throw new Error('eventId is missing');
            }
    
            const userToken = await AsyncStorage.getItem('authToken');
            if (!userToken) {
                throw new Error('User token is missing');
            }
    
            const method = liked ? 'DELETE' : 'POST';
            const body = method === 'POST' ? JSON.stringify({ eventId }) : null;
            const url = liked ? `${API_URL}/api/favorites/${eventId}` : `${API_URL}/api/favorites`;
    
            console.log('Request URL:', url); // Log the URL to ensure it's correct
            console.log('Request Body:', body); // Log the body to ensure it's correct
    
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body,
            });
    
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Failed to update favorite');
            }
    
            setLiked(!liked);
        } catch (error) {
            console.error('Error toggling favorite:', error.message);
        }
    };
    
    
    return (
        <View style={styles.container}>
            {event && (
                <>
                    <Image source={{ uri: event.imageUrl }} style={styles.image} />
                    <View style={styles.overlayIcons}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconCircle, styles.arrowIcon]}>
                            <FontAwesome name="arrow-left" size={20} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={toggleLike} style={[styles.iconCircle, styles.likeIcon]}>
                            <FontAwesome name={liked ? "heart" : "heart-o"} size={20} color="red" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.detailsContainer}>
                    <View style={styles.header}>
                    <Text style={styles.name}>{event.name}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.bellIcon}>
                        <FontAwesome name="bell" size={20} color="black" />
                    </TouchableOpacity>
                    </View>

                    <Text style={styles.details}>📅 {format(parseISO(event.date), "eeee 'the' do 'of' MMMM", { locale: enUS })}</Text>
                    <Text style={styles.details}>🕗 {format(parseISO(event.date + 'T' + event.time), 'HH:mm')}</Text>
                    <Text style={styles.details}>💰 {event.priceRange || "no price available"}</Text>
                    <Text style={styles.details}>📍 {`${event.venueAddress.address}, ${event.venueAddress.postalCode} ${event.venueAddress.city}`}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(event.eventUrl)} style={styles.ticketButton}>
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
                                    { transform: [{ scale: scaleAnim }] }, // Apply scaling animation
                                ]}
                                >
                                {["1 hour before", "1 day before", "2 days before", "1 week before"].map((reminder, index) => (
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
                                ))}
                            </Animated.View>
                        </TouchableOpacity>
                    </Modal>
                </>
            )}
        </View>
    );
};


const styles = StyleSheet.create({
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
        marginTop: 20,
        backgroundColor: 'black',
        padding: 10,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 220
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