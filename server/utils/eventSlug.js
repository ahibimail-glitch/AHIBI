function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Build a readable, unique slug from an event title (no random suffix).
 * Collisions resolve as title-2, title-3, ...
 */
async function generateUniqueEventSlug(title, model, excludeId = null) {
  const base = slugifyTitle(title);
  if (!base) {
    const fallback = `event-${Date.now()}`;
    const exists = await model.exists({ slug: fallback });
    return exists ? `${fallback}-${Date.now()}` : fallback;
  }

  let slug = base;
  let counter = 2;
  while (true) {
    const query = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
    const exists = await model.exists(query);
    if (!exists) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

module.exports = { slugifyTitle, generateUniqueEventSlug };
