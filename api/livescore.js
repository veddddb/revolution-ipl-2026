export default async function handler(req, res) {
  const token = process.env.NEXT_PUBLIC_SPORTMONKS_TOKEN;
  
  try {
    // We explicitly ask for localteam and visitorteam details
    const url = `https://cricket.sportmonks.com/api/v2.0/livescores?api_token=${token}&include=localteam,visitorteam,runs,batting.player,bowling.player,venue`;    const response = await fetch(url);
    const data = await response.json();
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch live scores' });
  }
}
