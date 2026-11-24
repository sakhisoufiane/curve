/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
}

export interface SearchResultsData {
  contracts: SearchResult[];
  releases: SearchResult[];
  tracks: SearchResult[];
  works: SearchResult[];
}

export const transformSearchResults = (results: any): SearchResultsData | undefined => {
  if (!results) return undefined;

  return {
    contracts:
      results.contracts?.map((item: any) => ({
        id: item._id,
        title: item.name,
        subtitle: item.type,
      })) || [],
    releases:
      results.releases?.map((item: any) => ({
        id: item._id,
        title: item.title,
        subtitle: item.artist,
      })) || [],
    tracks:
      results.tracks?.map((item: any) => ({
        id: item._id,
        title: item.title,
        subtitle: item.artist,
      })) || [],
    works:
      results.works?.map((item: any) => ({
        id: item._id,
        title: item.title,
        subtitle: item.composer,
      })) || [],
  };
};
