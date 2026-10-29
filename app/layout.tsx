import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'PetroAseo · Capacitaciones',description:'Portal de capacitaciones del personal de PetroAseo',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
