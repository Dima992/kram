"use client";

import { generateCatalogContent } from '@/ai/catalogAgent';
import { toast, useForm, useFormModified } from '@payloadcms/ui';
import React, { useState } from 'react';

const CatalogAgentButton: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const {
    getData,
    setFieldValue,
    dispatchFields,
    fields: formFields,
  } = useForm() as any;
  const { isModified } = useFormModified() as any;

  const handleGenerate = async () => {
    setLoading(true)
    const currentData = getData()

    // Extract necessary data from the form
    const productTitle = currentData.title
    const productDescription = currentData.description
    const categoryName = currentData.categories && currentData.categories.length > 0
      ? currentData.categories[0].name // Assuming first category for simplicity
      : undefined

    try {
      const response = await generateCatalogContent({
        productTitle,
        productDescription,
        categoryName,
      })

      if (response.error) {
        toast.error(response.error)
      } else if (response.result) {
        // Assuming the result is a string that might contain title, description, and slug
        // You might need more sophisticated parsing here based on your AI's output format
        const generatedContent = response.result
        console.log("AI Generated Content:", generatedContent)

        // Example of parsing and setting fields. Adjust based on AI output format.
        // For now, let's assume the AI returns a simple string that we can try to apply.
        // In a real scenario, the AI might return a JSON object with specific fields.

        // For demonstration, let's assume AI returns a string like "Title: New Title\nDescription: New Description\nSlug: new-slug"
        const titleMatch = generatedContent.match(/Title: (.*)\n/)
        const descriptionMatch = generatedContent.match(/Description: (.*)\n/)
        const slugMatch = generatedContent.match(/Slug: (.*)/)

        if (titleMatch && titleMatch[1]) {
          setFieldValue('title', titleMatch[1])
        }
        if (descriptionMatch && descriptionMatch[1]) {
          setFieldValue('description', descriptionMatch[1])
        }
        if (slugMatch && slugMatch[1]) {
          setFieldValue('slug', slugMatch[1])
        }
        // Fallback or if AI only generates a general text, update description
        if (!titleMatch && !descriptionMatch && !slugMatch) {
          setFieldValue('description', generatedContent) // Or append to existing description
        }

        toast.success('Content generated successfully!')
      }
    } catch (err) {
      console.error('Error generating content:', err)
      toast.error('Failed to generate content.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: '10px 15px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '15px',
        }}
      >
        {loading ? 'Generating...' : 'Generate Content with AI'}
      </button>
    </div>
  )
}

export default CatalogAgentButton
