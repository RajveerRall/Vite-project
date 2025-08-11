// import React, { useCallback } from 'react';
// import useEmblaCarousel from 'embla-carousel-react';
// import { BookData } from '@/types/books';
// import { ChevronLeft, ChevronRight } from 'lucide-react'; // Using a popular icon library

// interface BookCarouselProps {
//   books: BookData[];    
//   onBookSelect: (book: BookData) => void;
// }

// export const BookCarousel: React.FC<BookCarouselProps> = ({ books, onBookSelect }) => {
//   // Embla's core hook
//   const [emblaRef, emblaApi] = useEmblaCarousel({ 
//     align: 'start', 
//     containScroll: 'trimSnaps',
//     loop: false, // Don't loop if there are only a few books
//   });

//   // Functions to control the carousel with our custom buttons
//   const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
//   const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

//   return (
//     <div className="relative group">
//       {/* The main viewport for the carousel */}
//       <div className="overflow-hidden" ref={emblaRef}>
//         {/* The container that holds all the book "slides" */}
//         <div className="flex -ml-4">
//           {books.map(book => (
//             <div className="flex-grow-0 flex-shrink-0 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 pl-4" key={book.id}>
//               <div 
//                 className="book-slide block aspect-[2/3] rounded-lg overflow-hidden shadow-lg transform hover:-translate-y-2 transition-transform duration-300 cursor-pointer"
//                 onClick={() => onBookSelect(book)}
//               >
//                 {book.coverUrl ? (
//                   <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
//                 ) : (
//                   <div className="w-full h-full bg-amber-800 flex flex-col items-center justify-center p-2 text-white text-center">
//                     <h3 className="font-bold text-sm sm:text-base line-clamp-2">{book.title}</h3>
//                     <p className="text-xs sm:text-sm mt-1 opacity-80 line-clamp-1">{book.author}</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Left Arrow Button */}
//       <button 
//         className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-4 bg-white/80 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
//         onClick={scrollPrev}
//       >
//         <ChevronLeft className="w-6 h-6 text-gray-800" />
//       </button>

//       {/* Right Arrow Button */}
//       <button 
//         className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-4 bg-white/80 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
//         onClick={scrollNext}
//       >
//         <ChevronRight className="w-6 h-6 text-gray-800" />
//       </button>
//     </div>
//   );
// };

// BookCarousel.tsx
import React, { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { BookData } from '@/types/books';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BookCarouselProps {
  books: BookData[];
  onBookSelect: (book: BookData) => void;
}

export const BookCarousel: React.FC<BookCarouselProps> = ({ books, onBookSelect }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <div className="carousel">
      <div className="carousel-viewport" ref={emblaRef}>
        <div className="carousel-container">
          {books.map(book => (
            <div className="carousel-slide" key={book.id}>
              <div 
                className="book-slide-content"
                onClick={() => onBookSelect(book)}
              >
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="default-cover p-2 text-center">
                    <h3 className="font-bold text-sm sm:text-base line-clamp-2">{book.title}</h3>
                    <p className="text-xs sm:text-sm mt-1 opacity-80 line-clamp-1">{book.author}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="carousel-arrow prev" onClick={scrollPrev}>
        <ChevronLeft />
      </button>
      <button className="carousel-arrow next" onClick={scrollNext}>
        <ChevronRight />
      </button>
    </div>
  );
};