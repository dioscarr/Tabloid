import './style.css'

document.querySelector('#app').innerHTML = `
  <div class="page-shell">
    <header class="topbar">
      <div class="topbar-meta">
        <span>Thursday, August 21, 2026</span>
        <span>Vol. 42 No. 18</span>
      </div>
      <nav class="main-nav" aria-label="Main navigation">
        <a href="#">News</a>
        <a href="#">City</a>
        <a href="#">Politics</a>
        <a href="#">Culture</a>
        <a href="#">Business</a>
        <a href="#">Sports</a>
      </nav>
    </header>

    <div class="masthead">
      <div class="edition-tag">The morning paper</div>
      <h1>The Daily Echo</h1>
      <div class="tagline">Truth in a noisy world.</div>
    </div>

    <main class="tabloid-layout">
      <section class="lead-story">
        <div class="story-kicker">Front Page</div>
        <h2>City leaders unveil a waterfront revival plan that could reshape the skyline by 2030.</h2>
        <div class="story-meta">
          <span>By Mara Delgado</span>
          <span>8 min read</span>
        </div>
        <p>
          The new redevelopment package promises public parks, a transit link, and a wave of mixed-use towers—and residents are split between optimism and skepticism.
        </p>
        <div class="lead-image" aria-label="City waterfront skyline illustration"></div>
      </section>

      <aside class="sidebar">
        <article class="side-story">
          <span class="story-kicker">Politics</span>
          <h3>Senate vote sparks a late-night showdown over the transit bill.</h3>
        </article>
        <article class="side-story">
          <span class="story-kicker">Culture</span>
          <h3>Neighborhood theaters are staging a comeback with midnight screenings and live jazz.</h3>
        </article>
        <article class="side-story">
          <span class="story-kicker">Business</span>
          <h3>Startup founders chase a new wave of green manufacturing jobs.</h3>
        </article>
      </aside>

      <section class="ticker">
        <span>Breaking</span>
        <p>Power grid upgrades announced as heat wave threatens record demand across the metro area.</p>
      </section>

      <section class="feature-grid">
        <article class="feature-card feature-card-large">
          <div class="card-image image-one"></div>
          <div class="card-body">
            <span class="story-kicker">Lifestyle</span>
            <h3>Inside the rooftop gardens turning empty lots into community hubs.</h3>
          </div>
        </article>

        <article class="feature-card">
          <div class="card-image image-two"></div>
          <div class="card-body">
            <span class="story-kicker">Science</span>
            <h3>Researchers track a surprising rebound in urban bird populations.</h3>
          </div>
        </article>

        <article class="feature-card">
          <div class="card-image image-three"></div>
          <div class="card-body">
            <span class="story-kicker">Travel</span>
            <h3>Weekend escapes worth the train ride, from coastal towns to mountain inns.</h3>
          </div>
        </article>
      </section>

      <section class="news-column">
        <div class="section-head">
          <span>Latest</span>
          <h2>What else is moving the city</h2>
        </div>

        <article class="news-item">
          <span class="story-kicker">Metro</span>
          <h3>Commuters brace for fare changes as regional rail expands service.</h3>
        </article>
        <article class="news-item">
          <span class="story-kicker">School</span>
          <h3>Parents push for longer library hours after new literacy program gains traction.</h3>
        </article>
        <article class="news-item">
          <span class="story-kicker">Food</span>
          <h3>Local chefs turn historic storefronts into late-night dining destinations.</h3>
        </article>
      </section>

      <section class="editorial-box">
        <div class="editorial-label">Opinion</div>
        <h2>“We should build for people first, not for headlines.”</h2>
        <p>From zoning reform to public transit, the next chapter of the city will be decided in the details.</p>
      </section>
    </main>
  </div>
`
