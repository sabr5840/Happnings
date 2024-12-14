import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { API_URL } from '@env';

const EventDetailScreen = ({ route }) => {
    const { eventId } = route.params;
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEventDetail = async () => {
            const url = `${API_URL}/api/events/${eventId}`;
            try {
                const response = await fetch(url);
                const responseBody = await response.text();  // First get response as text to check if it's valid JSON
                try {
                    const data = JSON.parse(responseBody);  // Try parsing text to JSON
                    if (!response.ok) {
                        throw new Error(data.message || 'Network response was not ok');
                    }
                    setEvent(data);
                } catch (jsonError) {
                    console.error('Failed to parse JSON:', responseBody);
                    throw new Error('Response was not valid JSON');
                }
            } catch (error) {
                console.error('Error fetching event detail:', error);
                setError(`Failed to load event details: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchEventDetail();
    }, [eventId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text>{error}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {event && (
                <>
                    <Image source={{ uri: event.imageUrl }} style={styles.image} />
                    <Text style={styles.name}>{event.name}</Text>
                    <Text>{event.date} at {event.time}</Text>
                    <Text>{event.venue}, {event.venueAddress.city}</Text>
                    <Text>Price: {event.priceRange}</Text>
                    <Text>{event.eventUrl}</Text>
                </>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    image: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
});

export default EventDetailScreen;
