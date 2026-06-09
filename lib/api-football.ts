const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

interface ApiFootballMatch {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
  };
  league: {
    name: string;
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiFootballResponse {
  response: ApiFootballMatch[];
}

export async function fetchWorldcupMatches(year: number = 2026) {
  if (!API_KEY) {
    throw new Error('API_FOOTBALL_KEY no está configurada');
  }

  try {
    const response = await fetch(
      `${BASE_URL}/fixtures?league=1&season=${year}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ApiFootballResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error fetching from API Football:', error);
    throw error;
  }
}

export async function fetchMatchesForDate(date: string) {
  if (!API_KEY) {
    throw new Error('API_FOOTBALL_KEY no está configurada');
  }

  try {
    const response = await fetch(
      `${BASE_URL}/fixtures?date=${date}&league=1`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ApiFootballResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error fetching matches for date:', error);
    throw error;
  }
}

export async function fetchLiveMatches() {
  if (!API_KEY) {
    throw new Error('API_FOOTBALL_KEY no está configurada');
  }

  try {
    const response = await fetch(
      `${BASE_URL}/fixtures?live=all&league=1`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ApiFootballResponse = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error fetching live matches:', error);
    throw error;
  }
}
