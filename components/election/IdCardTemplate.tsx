import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    backgroundColor: '#ffffff'
  },
  pageTitle: {
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
    color: '#2d3748',
  },
  card: {
    width: '45%',
    height: 200, // A bit taller for more info
    border: '1pt solid #cbd5e0',
    borderRadius: 8,
    margin: '2.5%',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
    color: '#2b6cb0'
  },
  subHeader: {
    fontSize: 10,
    color: '#718096',
    marginBottom: 8,
    textAlign: 'center',
  },
  profileRow: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  initials: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: 'bold',
  },
  photo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  details: {
    fontSize: 9,
    color: '#4a5568',
    marginTop: 2,
  },
  codeBox: {
    padding: 8,
    backgroundColor: '#edf2f7',
    border: '1pt dashed #a0aec0',
    width: '100%',
    textAlign: 'center',
    borderRadius: 4,
  },
  codeLabel: {
    fontSize: 7,
    color: '#718096',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
    color: '#c53030', // Emphasized red
  },
  footer: {
    fontSize: 7,
    color: '#a0aec0',
    marginTop: 5,
    textAlign: 'center',
  }
});

interface VoterCard {
  studentName: string;
  rollNo: string;
  className: string;
  secretCode: string;
  photoUrl?: string; // Optional
}

export const IdCardTemplate = ({ cards, electionTitle, electionDate }: { cards: VoterCard[], electionTitle: string, electionDate: string }) => {
  const className = cards.length > 0 ? cards[0].className : 'Unknown Class';
  return (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.pageTitle}>
        <Text>{className} - Voter ID Cards (Total Students: {cards.length})</Text>
      </View>
      {cards.map((card, index) => {
        const initials = card.studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        
        return (
          <View key={index} style={styles.card}>
            <View style={{ width: '100%' }}>
              <Text style={styles.header}>AGS Student Council</Text>
              <Text style={styles.subHeader}>{electionTitle} • {electionDate}</Text>
            </View>
            
            <View style={styles.profileRow}>
              {card.photoUrl ? (
                <Image source={card.photoUrl} style={styles.photo} />
              ) : (
                <View style={styles.photoBox}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
              )}
              
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{card.studentName}</Text>
                <Text style={styles.details}>Roll No: {card.rollNo}</Text>
                <Text style={styles.details}>Class: {card.className}</Text>
              </View>
            </View>
            
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Secret Voter Code</Text>
              <Text style={styles.code}>{card.secretCode}</Text>
            </View>
            
            <Text style={styles.footer}>Keep this code strictly confidential. Do not share.</Text>
          </View>
        );
      })}
    </Page>
  </Document>
  );
};
