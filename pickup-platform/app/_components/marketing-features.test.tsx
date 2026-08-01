import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  FEATURE_GROUPS,
  FeaturesPageContent,
  HOME_FEATURE_HIGHLIGHTS,
  HOW_IT_WORKS,
  HomeFeatureHighlights,
  HowItWorks,
} from './marketing-features'

afterEach(() => {
  cleanup()
})

describe('marketing feature content', () => {
  it('keeps every feature title unique so the features page has no duplicate cards', () => {
    const titles = FEATURE_GROUPS.flatMap((group) => group.features.map((f) => f.title))
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('gives every feature an icon and a description', () => {
    for (const group of FEATURE_GROUPS) {
      expect(group.features.length).toBeGreaterThan(0)
      for (const feature of group.features) {
        expect(feature.icon).not.toBe('')
        expect(feature.description.length).toBeGreaterThan(20)
      }
    }
  })
})

describe('HowItWorks', () => {
  it('renders the numbered steps in order', () => {
    render(<HowItWorks />)

    const steps = screen.getAllByRole('listitem')
    expect(steps).toHaveLength(HOW_IT_WORKS.length)

    HOW_IT_WORKS.forEach((step, index) => {
      expect(steps[index]).toHaveTextContent(String(index + 1))
      expect(steps[index]).toHaveTextContent(step.title)
    })
  })
})

describe('HomeFeatureHighlights', () => {
  it('renders each highlight and links to the full features page', () => {
    render(<HomeFeatureHighlights />)

    for (const feature of HOME_FEATURE_HIGHLIGHTS) {
      expect(screen.getByRole('heading', { name: feature.title })).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: /explore all features/i })).toHaveAttribute(
      'href',
      '/features',
    )
  })
})

describe('FeaturesPageContent', () => {
  it('renders every feature group and feature', () => {
    render(<FeaturesPageContent />)

    for (const group of FEATURE_GROUPS) {
      expect(screen.getByRole('heading', { name: group.title })).toBeInTheDocument()
      for (const feature of group.features) {
        expect(screen.getByRole('heading', { name: feature.title })).toBeInTheDocument()
      }
    }
  })

  it('explains that players need no app and that other sports are supported', () => {
    render(<FeaturesPageContent />)

    expect(screen.getByRole('heading', { name: 'For players' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Not just soccer' })).toBeInTheDocument()
  })
})
