const Ticket = require('../models/Ticket');
const Scan = require('../models/Scan');
const User = require('../models/User');
const Event = require('../models/Event');

exports.scanQrCode = async (req, res) => {
  const { ticketId, userId } = req.body;

  try {
    const ticket = await Ticket.findById(ticketId).populate('event');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get the event and find the ticket type to get capacity
    const event = await Event.findById(ticket.event._id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Find the matching ticket type in the event to get the capacity
    const ticketTypeInfo = event.ticketTypes.find(t => t.name === ticket.ticketType);
    if (!ticketTypeInfo) {
      return res.status(400).json({ message: 'Invalid ticket type' });
    }
    
    // Get capacity from the ticket type
    const capacity = ticketTypeInfo.capacity || 1; // Default to 1 if not specified
    
    // Check for previous scans for this ticket
    const existingScans = await Scan.find({ ticket: ticketId });
    
    // Check if ticket has reached its capacity limit
    if (existingScans.length >= capacity) {
      return res.status(400).json({ 
        message: 'This ticket has reached its maximum capacity. No more entries allowed.',
        error: 'TICKET_EXHAUSTED'
      });
    }
    
    // Check if ticket has already been scanned for one-time tickets
    if (capacity === 1 && existingScans.length > 0) {
      return res.status(400).json({ 
        message: 'User is already inside venue. This ticket does not support multiple entries.',
        error: 'ALREADY_ENTERED'
      });
    }

    // Create a new scan record
    const newScan = new Scan({
      user: userId,
      ticket: ticketId,
      event: ticket.event._id,
    });

    await newScan.save();

    // Return more detailed information for the frontend
    res.status(200).json({ 
      message: 'Scan successful', 
      scan: newScan,
      ticketDetails: {
        id: ticket._id,
        ticketType: ticket.ticketType,
        capacity: capacity,
        remainingEntries: capacity - existingScans.length - 1
      },
      userDetails: {
        id: user._id,
        name: user.name || user.firstName + ' ' + user.lastName || userId,
        phone: user.phone
      },
      eventDetails: {
        id: event._id,
        name: event.eventName,
        date: event.startDate
      }
    });
  } catch (error) {
    console.error('Error scanning QR code:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
