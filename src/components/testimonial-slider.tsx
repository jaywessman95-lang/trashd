"use client";

import { useEffect, useState } from "react";

const TESTIMONIALS = [
  {
    quote: "I used to spend an hour every morning combing Craigslist. Now I open the dashboard and the best jobs are already ranked and waiting.",
    name: "Marcus T.",
    company: "3-truck operation · Orange County, CA"
  },
  {
    quote: "Got a full 4-bedroom estate cleanout from EstateSales.net last week. Never would have found it that fast on my own.",
    name: "Desiree R.",
    company: "Solo operator · Anaheim, CA"
  },
  {
    quote: "The AI scoring actually works. Any lead scoring 80+ has been worth calling on. It knows the difference between junk and a real job.",
    name: "James P.",
    company: "Franchise owner · Irvine, CA"
  },
  {
    quote: "Set it up in 20 minutes, configured my cities, and it's been running on autopilot for two months. Already paid for itself.",
    name: "Celeste W.",
    company: "2-crew operation · Costa Mesa, CA"
  }
];

export function TestimonialSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <section className="home-testimonials">
      <div className="container home-testimonials-inner">
        <div className="home-testimonials-label">What operators are saying</div>
        <div className="home-testimonials-card">
          <div className="home-testimonials-quote-mark">&quot;</div>
          <p className="home-testimonials-quote">{t.quote}</p>
          <div className="home-testimonials-author">
            <div className="home-testimonials-avatar">{t.name[0]}</div>
            <div>
              <div className="home-testimonials-name">{t.name}</div>
              <div className="home-testimonials-company">{t.company}</div>
            </div>
          </div>
        </div>
        <div className="home-testimonials-dots">
          {TESTIMONIALS.map((_, i) => (
            <button
              aria-label={`Testimonial ${i + 1}`}
              className={`home-dot${i === active ? " home-dot-active" : ""}`}
              key={i}
              onClick={() => setActive(i)}
              type="button"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
