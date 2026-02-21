import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Star, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router';
import { db, Product, Course } from '../../../lib/db';
import { formatCurrency } from '../../../lib/utils';
import { useCartStore } from '../../../lib/store';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = React.useState<Product[]>([]);
  const [featuredCourses, setFeaturedCourses] = React.useState<Course[]>([]);
  const [bookingUrl, setBookingUrl] = React.useState('https://structurahair.booksy.com');
  const addItem = useCartStore((state) => state.addItem);

  React.useEffect(() => {
    async function loadData() {
      // Seed first to ensure data
      await db.seedIfNeeded();

      const products = await db.getProducts();
      // Filter active and ensure images
      const active = products.filter(p => p.isActive);
      setFeaturedProducts(active.slice(0, 3));
      
      const courses = await db.getCourses();
      setFeaturedCourses(courses.slice(0, 2));

      const settings = await db.getBookingSettings();
      if (settings?.bookingUrl) {
        setBookingUrl(settings.bookingUrl);
      }
    }
    loadData();
  }, []);

  const handleBookNow = () => {
    window.open(bookingUrl, '_blank');
  };

  const handleAddToCart = async (product: Product) => {
    // Need to get stock and adapt to store format
    const stock = product.trackInventory ? await db.getProductStock(product.id) : 999;
    
    // Simple add, assuming no variant selection needed for homepage quick add
    // Also assuming no promo for quick add on homepage (or fetch it if needed)
    // For MVP homepage, we use base price. Real implementation should fetch promo.
    
    addItem({
        id: product.id,
        type: 'product',
        title: product.title,
        price: product.priceMinor / 100, // Convert to major
        currency: product.currency,
        image: product.images?.[0] || '',
        maxStock: stock
    });
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[90vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/20 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1619613876444-b27674b9d15b?auto=format&fit=crop&w=2000&q=80" 
          alt="Editorial Hair Model" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 h-full container-luxury flex flex-col justify-center items-start text-ivory">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <h1 className="text-6xl md:text-8xl font-display mb-6 leading-none">
              Artistry in <br />
              <span className="italic text-gold">Motion</span>
            </h1>
            <p className="text-xl md:text-2xl font-serif font-light mb-10 max-w-lg leading-relaxed text-gray-200">
              Where precision meets luxury. Experience world-class hair care and education at Structura.
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <Button variant="gold" size="lg" onClick={handleBookNow}>Book Appointment</Button>
              <Link to="/academy">
                <Button variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-charcoal" size="lg">
                  Explore Academy
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 bg-ivory">
        <div className="container-luxury grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1758788390320-16e1f280cf49?auto=format&fit=crop&w=1000&q=80" 
                alt="Salon Interior" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl" />
          </div>
          <div>
            <span className="text-gold uppercase tracking-widest text-sm font-semibold mb-4 block">Our Philosophy</span>
            <h2 className="text-4xl md:text-5xl font-display mb-8 leading-tight">
              A Sanctuary for <br />Modern Aesthetics
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              At Structura, we believe that hair is the ultimate form of self-expression. Our approach combines architectural precision with organic flow, creating styles that are both timeless and contemporary.
            </p>
            <p className="text-gray-600 mb-10 leading-relaxed">
              Whether you are here for a transformative cut or to elevate your professional skills, our space is designed to inspire.
            </p>
            <Link to="/services" className="group inline-flex items-center text-charcoal font-display uppercase tracking-widest text-sm border-b border-charcoal pb-1 hover:text-gold hover:border-gold transition-colors">
              View Services <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-32 bg-white border-y border-gray-100">
        <div className="container-luxury">
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-gold uppercase tracking-widest text-sm font-semibold mb-2 block">Shop</span>
              <h2 className="text-4xl font-display">Curated Essentials</h2>
            </div>
            <Link to="/shop" className="hidden md:block text-sm uppercase tracking-widest hover:text-gold transition-colors">
              View All Products
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <div key={product.id} className="group">
                <div className="bg-gray-50 aspect-[3/4] mb-6 overflow-hidden relative">
                  <Link to={`/shop/product/${product.slug}`}>
                      {product.images?.[0] ? (
                        <img 
                            src={product.images[0]} 
                            alt={product.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                      )}
                  </Link>
                  <button 
                    onClick={() => handleAddToCart(product)}
                    className="absolute bottom-0 left-0 w-full bg-charcoal text-ivory py-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 font-display uppercase tracking-wider text-sm hover:bg-gold hover:text-charcoal"
                  >
                    Add to Cart
                  </button>
                </div>
                <Link to={`/shop/product/${product.slug}`}>
                    <h3 className="font-display text-lg mb-1 hover:text-gold transition-colors">{product.title}</h3>
                </Link>
                <p className="text-gray-500 font-serif">{formatCurrency(product.priceMinor / 100, product.currency)}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center md:hidden">
            <Link to="/shop">
               <Button variant="outline">View All Products</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Academy Preview */}
      <section className="py-32 bg-charcoal text-ivory">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-5">
              <span className="text-gold uppercase tracking-widest text-sm font-semibold mb-4 block">The Academy</span>
              <h2 className="text-4xl md:text-5xl font-display mb-8">Master the Craft</h2>
              <p className="text-gray-400 mb-10 leading-relaxed">
                Join an elite community of stylists. Our curriculum is designed to bridge the gap between fundamental technique and editorial artistry.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gold">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-lg">Expert Mentorship</h4>
                    <p className="text-sm text-gray-400">Learn directly from industry leaders.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-lg">Flexible Learning</h4>
                    <p className="text-sm text-gray-400">Online and in-person modules available.</p>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <Link to="/academy">
                  <Button variant="gold">View Courses</Button>
                </Link>
              </div>
            </div>
            
            <div className="lg:col-span-7 grid gap-6">
              {featuredCourses.map((course) => (
                <Link key={course.id} to={`/academy/course/${course.id}`} className="block group">
                  <div className="bg-white/5 p-6 border border-white/10 hover:border-gold/50 transition-colors flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 aspect-video bg-gray-800 overflow-hidden">
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-display text-xl group-hover:text-gold transition-colors">{course.title}</h3>
                         <span className="bg-white/10 text-xs px-2 py-1 uppercase tracking-widest rounded">{formatCurrency(course.price)}</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                      <span className="text-xs uppercase tracking-widest text-gold flex items-center">
                        View Details <ArrowRight className="ml-2 w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Booking Embed */}
      <section className="py-32 bg-ivory text-center">
        <div className="container-luxury max-w-4xl">
          <h2 className="text-4xl font-display mb-6">Ready to Transform?</h2>
          <p className="text-gray-600 mb-10">Book your appointment with our senior stylists today.</p>
          <div className="bg-white p-8 shadow-sm border border-gray-100 min-h-[300px] flex items-center justify-center">
             <div className="text-center">
               <p className="mb-4 text-gray-400 italic">Official Booking Partner</p>
               <Button variant="primary" size="lg" onClick={handleBookNow}>Book Appointment</Button>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
