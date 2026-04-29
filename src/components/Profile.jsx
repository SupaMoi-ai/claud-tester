import { useEffect, useMemo, useRef, useState } from 'react'
import ProfileSection from './ProfileSection.jsx'
import InfoTooltip from './InfoTooltip.jsx'
import { NEUROLOGY_INFO } from '../lib/content.js'
import {
  saveProfile,
  clearProfile,
  exportProfileFile,
  importProfileFile,
  debounce,
} from '../lib/storage.js'

const EMPTY = {
  name: '',
  cycleLength: 28,
  lastPeriod: '',
  relationship: 'girlfriend',
  personality: { type: '', social: '', processing: '', conflictStyle: '' },
  neurology: [],
  comfort: [],
  entertainment: [],
  food: { cravings: [], favorites: '', dietary: '' },
  drinks: [],
  gifts: { types: [], flowers: '', scent: '' },
  loveLanguages: [],
  background: {
    culture: '', languages: '', familyImportance: '', careerLevel: '', values: [],
  },
  notes: '',
}

function Pill({ active, onClick, children, info }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`checkbox-pill ${active ? 'active' : ''}`}
    >
      <span>{children}</span>
      {info && <InfoTooltip text={info} />}
    </button>
  )
}

function PillGroup({ value, options, onChange, multi = true, infos = {} }) {
  const arr = Array.isArray(value) ? value : value ? [value] : []
  const toggle = (id) => {
    if (multi) {
      onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
    } else {
      onChange(arr[0] === id ? '' : id)
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Pill
          key={opt.id}
          active={arr.includes(opt.id)}
          onClick={() => toggle(opt.id)}
          info={infos[opt.id]}
        >
          {opt.label}
        </Pill>
      ))}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="label block mb-2">{label}</span>
      {children}
    </label>
  )
}

export default function Profile({ profile, onChange }) {
  const [data, setData] = useState(profile || EMPTY)
  const [savedFlash, setSavedFlash] = useState(false)
  const importRef = useRef(null)

  const debouncedSave = useMemo(
    () =>
      debounce((next) => {
        const saved = saveProfile(next)
        onChange(saved)
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
      }, 500),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (!data.lastPeriod) return
    debouncedSave(data)
  }, [data, debouncedSave])

  const set = (key, value) => setData((d) => ({ ...d, [key]: value }))
  const setNested = (parent, key, value) =>
    setData((d) => ({ ...d, [parent]: { ...d[parent], [key]: value } }))

  const onClear = () => {
    if (window.confirm('Clear her profile? This cannot be undone.')) {
      clearProfile()
      setData(EMPTY)
      onChange(null)
    }
  }

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const saved = await importProfileFile(file)
      setData({ ...EMPTY, ...saved })
      onChange(saved)
      alert('Profile imported.')
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6 stagger">
      <header>
        <div className="label">// section :: profile builder</div>
        <h2 className="display text-3xl sm:text-5xl text-cream mt-2">HER PROFILE</h2>
        <p className="text-cream/70 mt-2 max-w-2xl">
          The more you fill in, the smarter the playbook gets. Auto-saves as you type.
        </p>
      </header>

      {/* 1 — Basics */}
      <ProfileSection number={1} title="The Basics" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Her name">
            <input
              className="input"
              value={data.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g., Maya"
            />
          </Field>
          <Field label="Cycle length (days)">
            <input
              type="number"
              min={21}
              max={35}
              className="input"
              value={data.cycleLength}
              onChange={(e) => set('cycleLength', Math.max(21, Math.min(35, parseInt(e.target.value) || 28)))}
            />
          </Field>
          <Field label="First day of her last period">
            <input
              type="date"
              className="input"
              value={data.lastPeriod || ''}
              onChange={(e) => set('lastPeriod', e.target.value)}
            />
          </Field>
          <Field label="Relationship">
            <PillGroup
              multi={false}
              value={data.relationship}
              onChange={(v) => set('relationship', v || 'girlfriend')}
              options={[
                { id: 'girlfriend', label: 'Girlfriend' },
                { id: 'wife', label: 'Wife' },
                { id: 'partner', label: 'Partner' },
                { id: 'other', label: 'Other' },
              ]}
            />
          </Field>
        </div>
      </ProfileSection>

      {/* 2 — Personality */}
      <ProfileSection number={2} title="Her Personality">
        <Field label="Type">
          <PillGroup
            multi={false}
            value={data.personality.type}
            onChange={(v) => setNested('personality', 'type', v)}
            options={[
              { id: 'a-type', label: 'A-Type' },
              { id: 'b-type', label: 'B-Type' },
            ]}
          />
        </Field>
        <Field label="Social">
          <PillGroup
            multi={false}
            value={data.personality.social}
            onChange={(v) => setNested('personality', 'social', v)}
            options={[
              { id: 'introvert', label: 'Introvert' },
              { id: 'extrovert', label: 'Extrovert' },
              { id: 'ambivert', label: 'Ambivert' },
            ]}
          />
        </Field>
        <Field label="Processing">
          <PillGroup
            multi={false}
            value={data.personality.processing}
            onChange={(v) => setNested('personality', 'processing', v)}
            options={[
              { id: 'alone', label: 'Needs time alone to process' },
              { id: 'talk', label: 'Needs to talk things through' },
            ]}
          />
        </Field>
        <Field label="Conflict style">
          <PillGroup
            multi={false}
            value={data.personality.conflictStyle}
            onChange={(v) => setNested('personality', 'conflictStyle', v)}
            options={[
              { id: 'withdraw', label: 'Withdraws' },
              { id: 'immediate', label: 'Wants to resolve immediately' },
              { id: 'delayed', label: 'Needs a day, then talks' },
            ]}
          />
        </Field>
      </ProfileSection>

      {/* 3 — Neurology */}
      <ProfileSection number={3} title="Neurology & Mental Health">
        <p className="text-cream/70 text-sm mb-4">
          Hover the ⓘ on each item for context. Be honest — it shapes the personalized guide.
        </p>
        <PillGroup
          value={data.neurology}
          onChange={(v) => set('neurology', v)}
          options={[
            { id: 'adhd', label: NEUROLOGY_INFO.adhd.label },
            { id: 'anxiety', label: NEUROLOGY_INFO.anxiety.label },
            { id: 'depression', label: NEUROLOGY_INFO.depression.label },
            { id: 'autism', label: NEUROLOGY_INFO.autism.label },
            { id: 'sensory', label: NEUROLOGY_INFO.sensory.label },
            { id: 'none', label: 'None of the above' },
          ]}
          infos={{
            adhd: NEUROLOGY_INFO.adhd.info,
            anxiety: NEUROLOGY_INFO.anxiety.info,
            depression: NEUROLOGY_INFO.depression.info,
            autism: NEUROLOGY_INFO.autism.info,
            sensory: NEUROLOGY_INFO.sensory.info,
          }}
        />
      </ProfileSection>

      {/* 4 — Comfort */}
      <ProfileSection number={4} title="What Comforts Her">
        <PillGroup
          value={data.comfort}
          onChange={(v) => set('comfort', v)}
          options={[
            { id: 'cuddles', label: 'Physical touch / Cuddles' },
            { id: 'massage', label: 'Back or foot massage' },
            { id: 'heat', label: 'Heat (bath, heating pad)' },
            { id: 'space-alone', label: 'Space and alone time' },
            { id: 'weighted-blanket', label: 'Weighted blanket' },
            { id: 'held', label: 'Being held' },
            { id: 'acts', label: 'Acts of service' },
            { id: 'verbal-reassurance', label: 'Verbal reassurance' },
          ]}
        />
      </ProfileSection>

      {/* 5 — Entertainment */}
      <ProfileSection number={5} title="Entertainment & Hobbies">
        <PillGroup
          value={data.entertainment}
          onChange={(v) => set('entertainment', v)}
          options={[
            { id: 'reading', label: 'Reading (books/poetry)' },
            { id: 'shows', label: 'Shows / Movies' },
            { id: 'gaming', label: 'Gaming' },
            { id: 'music', label: 'Music / Playlists' },
            { id: 'art', label: 'Art / Creative projects' },
            { id: 'fitness', label: 'Fitness / Yoga' },
            { id: 'cooking', label: 'Cooking / Baking' },
            { id: 'social', label: 'Social media / Phone scrolling' },
          ]}
        />
      </ProfileSection>

      {/* 6 — Food */}
      <ProfileSection number={6} title="Food & Drinks">
        <Field label="Cravings">
          <PillGroup
            value={data.food.cravings}
            onChange={(v) => setNested('food', 'cravings', v)}
            options={[
              { id: 'sweet', label: 'Sweet' },
              { id: 'salty', label: 'Salty' },
              { id: 'comfort-carbs', label: 'Comfort carbs' },
              { id: 'spicy', label: 'Spicy' },
              { id: 'healthy', label: 'Healthy / Light' },
            ]}
          />
        </Field>
        <Field label="Her specific favorites">
          <input
            className="input"
            value={data.food.favorites}
            onChange={(e) => setNested('food', 'favorites', e.target.value)}
            placeholder="e.g., dark chocolate, ramen, crispy noodles"
          />
        </Field>
        <Field label="Dietary restrictions">
          <input
            className="input"
            value={data.food.dietary}
            onChange={(e) => setNested('food', 'dietary', e.target.value)}
            placeholder="e.g., lactose intolerant, vegetarian"
          />
        </Field>
        <Field label="Drinks">
          <PillGroup
            value={data.drinks}
            onChange={(v) => set('drinks', v)}
            options={[
              { id: 'coffee', label: 'Coffee' },
              { id: 'tea', label: 'Tea' },
              { id: 'herbal-tea', label: 'Herbal tea' },
              { id: 'juice', label: 'Juice / Smoothies' },
              { id: 'sparkling', label: 'Sparkling water' },
              { id: 'wine-beer', label: 'Wine / Beer' },
            ]}
          />
        </Field>
      </ProfileSection>

      {/* 7 — Things that make her happy (gifts) */}
      <ProfileSection number={7} title="Things That Make Her Happy">
        <PillGroup
          value={data.gifts.types}
          onChange={(v) => setNested('gifts', 'types', v)}
          options={[
            { id: 'flowers', label: 'Flowers' },
            { id: 'skincare', label: 'Skincare / Beauty' },
            { id: 'candles', label: 'Candles / Scents' },
            { id: 'jewelry', label: 'Jewelry' },
            { id: 'plants', label: 'Plants' },
            { id: 'stationery', label: 'Stationery / Books' },
            { id: 'experiences', label: 'Experiences' },
            { id: 'music', label: 'Music / Concerts' },
            { id: 'notes', label: 'Surprise notes / messages' },
          ]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Favorite flowers">
            <input
              className="input"
              value={data.gifts.flowers}
              onChange={(e) => setNested('gifts', 'flowers', e.target.value)}
              placeholder="e.g., peonies, ranunculus"
            />
          </Field>
          <Field label="Scent preference">
            <input
              className="input"
              value={data.gifts.scent}
              onChange={(e) => setNested('gifts', 'scent', e.target.value)}
              placeholder="warm / fresh / floral / earthy"
            />
          </Field>
        </div>
      </ProfileSection>

      {/* 8 — Love Languages */}
      <ProfileSection number={8} title="Love Languages">
        <p className="text-cream/70 text-sm mb-4">
          Pick all that apply. The first ones you choose carry the most weight.
        </p>
        <PillGroup
          value={data.loveLanguages}
          onChange={(v) => set('loveLanguages', v)}
          options={[
            { id: 'words-of-affirmation', label: 'Words of Affirmation' },
            { id: 'acts-of-service', label: 'Acts of Service' },
            { id: 'receiving-gifts', label: 'Receiving Gifts' },
            { id: 'quality-time', label: 'Quality Time' },
            { id: 'physical-touch', label: 'Physical Touch' },
          ]}
        />
      </ProfileSection>

      {/* 9 — Background */}
      <ProfileSection number={9} title="Her World & Background">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Cultural background">
            <input
              className="input"
              value={data.background.culture}
              onChange={(e) => setNested('background', 'culture', e.target.value)}
              placeholder="e.g., Italian-American"
            />
          </Field>
          <Field label="Languages spoken">
            <input
              className="input"
              value={data.background.languages}
              onChange={(e) => setNested('background', 'languages', e.target.value)}
              placeholder="e.g., English, Spanish"
            />
          </Field>
        </div>
        <Field label="Family importance">
          <PillGroup
            multi={false}
            value={data.background.familyImportance}
            onChange={(v) => setNested('background', 'familyImportance', v)}
            options={[
              { id: 'low', label: 'Low' },
              { id: 'medium', label: 'Medium' },
              { id: 'high', label: 'High' },
              { id: 'central', label: 'Central to everything' },
            ]}
          />
        </Field>
        <Field label="Career / Ambition level">
          <PillGroup
            multi={false}
            value={data.background.careerLevel}
            onChange={(v) => setNested('background', 'careerLevel', v)}
            options={[
              { id: 'not-focused', label: 'Not career-focused' },
              { id: 'balanced', label: 'Balanced' },
              { id: 'ambitious', label: 'Highly ambitious' },
            ]}
          />
        </Field>
        <Field label="Values">
          <PillGroup
            value={data.background.values}
            onChange={(v) => setNested('background', 'values', v)}
            options={[
              { id: 'family', label: 'Family' },
              { id: 'career', label: 'Career' },
              { id: 'travel', label: 'Travel' },
              { id: 'health', label: 'Health' },
              { id: 'spirituality', label: 'Spirituality' },
              { id: 'community', label: 'Community' },
              { id: 'art', label: 'Art / Culture' },
              { id: 'finance', label: 'Financial security' },
            ]}
          />
        </Field>
      </ProfileSection>

      {/* 10 — Notes */}
      <ProfileSection number={10} title="Notes — The Unwritten Rules">
        <Field label="The stuff only you would know">
          <textarea
            className="input min-h-[160px]"
            value={data.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Pet peeves, secret wins, things to absolutely avoid, what she hates people doing, what makes her feel instantly better…"
          />
        </Field>
      </ProfileSection>

      <div className="card flex flex-wrap items-center justify-between gap-3 sticky bottom-4">
        <div className="flex items-center gap-3">
          <span className={`label transition-opacity ${savedFlash ? 'opacity-100 text-green' : 'opacity-50'}`}>
            {savedFlash ? '✓ SAVED' : '// auto-save on'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost" onClick={exportProfileFile} disabled={!profile}>Export</button>
          <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>Import</button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImport}
          />
          <button className="btn btn-ghost" onClick={onClear}>Clear</button>
        </div>
      </div>
    </div>
  )
}
