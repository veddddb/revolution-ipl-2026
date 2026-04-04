export default async function handler(req, res) {
  // This pulls your token from Vercel's private environment variables
  const token = process.env.NEXT_PUBLIC_SPORTMONKS_TOKEN;
  
  try {
    const response = await fetch(`https://cricket.sportmonks.com/api/v2.0/livescores?api_token=${token}&include=localteam,visitorteam,runs`);
    const data = await response.json();
    
    // Send the data to your frontend
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch live scores' });
  }
}
