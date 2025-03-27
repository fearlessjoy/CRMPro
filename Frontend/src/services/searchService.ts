import { collection, query, getDocs, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead } from './leadService';
import { Invoice } from './invoiceService';

export interface SearchResult {
  id: string;
  type: 'lead' | 'invoice';
  title: string;
  subtitle: string;
  status?: string;
  link: string;
}

export async function globalSearch(searchQuery: string): Promise<SearchResult[]> {
  if (!searchQuery.trim()) return [];
  
  const results: SearchResult[] = [];
  const searchTerm = searchQuery.toLowerCase();
  console.log('Performing search with term:', searchTerm);

  try {
    // Search Leads
    console.log('Searching leads...');
    const leadsRef = collection(firestore, 'leads');
    const leadsQuery = query(leadsRef, limit(10));
    const leadsSnapshot = await getDocs(leadsQuery);
    console.log('Found leads:', leadsSnapshot.size);
    
    const leadsResults = leadsSnapshot.docs
      .map(doc => {
        const data = doc.data() as Lead;
        console.log('Checking lead:', data);
        if (
          data.name?.toLowerCase().includes(searchTerm) ||
          data.email?.toLowerCase().includes(searchTerm) ||
          data.phone?.includes(searchTerm)
        ) {
          console.log('Lead matched:', data.name);
          const result = {
            id: doc.id,
            type: 'lead' as const,
            title: data.name || 'Unnamed Lead',
            subtitle: data.email || data.phone || 'No contact info',
            status: data.status,
            link: `/leads/${doc.id}`
          };
          return result;
        }
        return null;
      })
      .filter(Boolean) as SearchResult[];
    
    console.log('Matched leads:', leadsResults.length);
    results.push(...leadsResults);

    // Search Invoices
    console.log('Searching invoices...');
    const invoicesRef = collection(firestore, 'invoices');
    const invoicesQuery = query(invoicesRef, limit(10));
    const invoicesSnapshot = await getDocs(invoicesQuery);
    console.log('Found invoices:', invoicesSnapshot.size);
    
    const invoiceResults = invoicesSnapshot.docs
      .map(doc => {
        const data = doc.data() as Invoice;
        console.log('Checking invoice:', data);
        if (
          data.invoiceNumber?.toLowerCase().includes(searchTerm) ||
          data.customerName?.toLowerCase().includes(searchTerm) ||
          data.customerEmail?.toLowerCase().includes(searchTerm)
        ) {
          console.log('Invoice matched:', data.invoiceNumber);
          const result = {
            id: doc.id,
            type: 'invoice' as const,
            title: `Invoice #${data.invoiceNumber}`,
            subtitle: data.customerName || 'No customer name',
            status: data.status,
            link: `/invoices/${doc.id}`
          };
          return result;
        }
        return null;
      })
      .filter(Boolean) as SearchResult[];
    
    console.log('Matched invoices:', invoiceResults.length);
    results.push(...invoiceResults);

    console.log('Total results:', results.length);
    return results;
  } catch (error) {
    console.error('Error performing global search:', error);
    return [];
  }
} 