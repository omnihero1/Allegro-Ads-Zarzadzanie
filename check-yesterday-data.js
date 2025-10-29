// Quick script to check if we have yesterday's data in Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkYesterdayData() {
  // Calculate yesterday's date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${year}-${month}-${day}`;
  
  console.log(`\n🔍 Sprawdzam dane dla wczoraj: ${yesterdayStr}\n`);
  
  // Check dailyClientAdStats
  console.log('📊 dailyClientAdStats:');
  const adStatsSnapshot = await db.collection('dailyClientAdStats')
    .where('date', '==', yesterdayStr)
    .get();
  
  if (adStatsSnapshot.empty) {
    console.log('   ❌ Brak danych dla wczoraj');
  } else {
    console.log(`   ✅ Znaleziono ${adStatsSnapshot.size} rekordów`);
    adStatsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`      • accountId: ${data.accountId}`);
      console.log(`        clientId: ${data.clientId}`);
      console.log(`        totalCost: ${data.totalCost} PLN`);
      console.log(`        totalAttributionValue: ${data.totalAttributionValue} PLN`);
      console.log(`        totalAttributionCount: ${data.totalAttributionCount}`);
      console.log('');
    });
  }
  
  // Check dailyOrderStats
  console.log('\n📦 dailyOrderStats:');
  const orderStatsSnapshot = await db.collection('dailyOrderStats')
    .where('date', '==', yesterdayStr)
    .get();
  
  if (orderStatsSnapshot.empty) {
    console.log('   ❌ Brak danych dla wczoraj');
  } else {
    console.log(`   ✅ Znaleziono ${orderStatsSnapshot.size} rekordów`);
    orderStatsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`      • accountId: ${data.accountId}`);
      console.log(`        totalSales: ${data.totalSales} PLN`);
      console.log(`        totalOrders: ${data.totalOrders}`);
      console.log('');
    });
  }
  
  // Check account mappings
  console.log('\n🔗 Account Mappings:');
  const mappingsSnapshot = await db.collection('accountMappings').get();
  
  if (mappingsSnapshot.empty) {
    console.log('   ⚠️  Brak mapowań kont (Sales ↔ Ads)');
    console.log('   💡 Dodaj mapowanie w: http://localhost:5173/administration');
  } else {
    console.log(`   ✅ Znaleziono ${mappingsSnapshot.size} mapowań`);
    mappingsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`      • ${doc.id} (Sales) → ${data.agencyAccountId} / ${data.agencyClientId} (Ads)`);
    });
  }
  
  console.log('\n✅ Sprawdzanie zakończone\n');
}

checkYesterdayData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Błąd:', error);
    process.exit(1);
  });

