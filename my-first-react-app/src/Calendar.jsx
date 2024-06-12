// src/Calendar.js
import React, {useState, useEffect} from 'react';
import axios from 'axios';
import './Calendar.css';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [days, setDays] = useState([]);
    const [events, setEvents] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);
    const [error, setError] = useState('');
    const [dayEvents, setDayEvents] = useState([]);

    useEffect(() => {
        generateCalendar(currentDate);
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = () => {
        axios.get('http://localhost:5000/api/events')
            .then(response => setEvents(response.data))
            .catch(error => console.error('Error fetching events:', error));
    };

    const generateCalendar = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        const prevLastDate = new Date(year, month, 0).getDate();

        let tempDays = [];
        for (let i = firstDay - 1; i >= 0; i--) {
            tempDays.push({date: prevLastDate - i, currentMonth: false});
        }
        for (let i = 1; i <= lastDate; i++) {
            tempDays.push({date: i, currentMonth: true});
        }
        setDays(tempDays);
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDayClick = (day) => {
        if (day.currentMonth) {
            const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day.date);
            setSelectedDate(selected);
            setDayEvents(events.filter(event => new Date(event.event_date).toDateString() === selected.toDateString()));
            setShowPopup(true);
        }
    };

    const handleCreateEvent = (e) => {
        e.preventDefault();
        if (!eventTitle.trim() || !selectedDate) {
            setError('Event title and date are required');
            return;
        }

        const eventDate = selectedDate.toISOString().split('T')[0];
        axios.post('http://localhost:5000/api/events', {
            title: eventTitle,
            description: eventDescription,
            event_date: eventDate
        })
            .then(() => {
                fetchEvents(); // Fetch events again to get the updated list
                setShowPopup(false);
                setEventTitle('');
                setEventDescription('');
                setError('');
            })
            .catch(error => {
                setError('Error creating event');
                console.error('Error creating event:', error);
            });
    };

    const handleDeleteEvent = (eventId) => {
        axios.delete(`http://localhost:5000/api/events/${eventId}`)
            .then(() => {
                fetchEvents(); // Fetch events again to get the updated list
            })
            .catch(error => {
                setError('Error deleting event');
                console.error('Error deleting event:', error);
            });
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    return (
        <div className="calendar">
            <div className="month">
                <div className="prev" onClick={handlePrevMonth}>&#10094;</div>
                <div className="month-name">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
                <div className="next" onClick={handleNextMonth}>&#10095;</div>
            </div>
            <div className="weekdays">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
            </div>
            <div className="days">
                {days.map((day, index) => {
                    const hasEvent = events.some(event => new Date(event.event_date).toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day.date).toDateString());
                    return (
                        <div key={index}
                             className={`day ${day.currentMonth ? '' : 'prev-next-month'} ${hasEvent ? 'has-event' : ''}`}
                             onClick={() => handleDayClick(day)}>
                            {day.date}
                        </div>
                    );
                })}
            </div>

            {showPopup && (
                <div className="popup">
                    <div className="popup-inner">
                        <h2>{`Events for ${selectedDate.toDateString()}`}</h2>
                        <form onSubmit={handleCreateEvent}>
                            <div>
                                <input
                                    type="text"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    placeholder="Event Title"
                                />
                                <input
                                    type="text"
                                    value={eventDescription}
                                    onChange={(e) => setEventDescription(e.target.value)}
                                    placeholder="Event Description"
                                />
                            </div>
                            <div>
                                <button onClick={() => setShowPopup(false)}>Close</button>
                                <button type="submit">Create</button>
                            </div>

                        </form>
                        {dayEvents.map(event => (
                            <div key={event.id} className="event">
                                <span>{`${event.title} (created by ${event.creator})`}</span>
                                <button onClick={() => handleDeleteEvent(event.id)}>Delete</button>
                            </div>
                        ))}
                        {error && <p style={{color: 'red'}}>{error}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
