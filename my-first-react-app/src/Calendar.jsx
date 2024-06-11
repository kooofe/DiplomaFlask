// src/Calendar.js
import React, { useState, useEffect } from 'react';
import './Calendar.css';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState([]);

  useEffect(() => {
    generateCalendar(currentDate);
  }, [currentDate]);

  const generateCalendar = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    let tempDays = [];
    for (let i = firstDay; i > 0; i--) {
      tempDays.push(prevLastDate - i + 1);
    }
    for (let i = 1; i <= lastDate; i++) {
      tempDays.push(i);
    }
    setDays(tempDays);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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
        {days.map((day, index) => (
          <div key={index} className="day">{day}</div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
