import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const batchId = params.id

    // Get batch members
    const { data: batchMembers, error } = await supabase
      .from("batch_members")
      .select(
        `
        *,
        users:user_id (id, name, email)
      `,
      )
      .eq("batch_id", batchId)

    if (error) {
      console.error("Error fetching batch members:", error)
      return NextResponse.json({ error: "Failed to fetch batch members" }, { status: 500 })
    }

    return NextResponse.json({ members: batchMembers || [] })
  } catch (error: any) {
    console.error("Error in batch members API:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch batch members" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userIds } = await request.json()
    const batchId = params.id

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: "No members selected" }, { status: 400 })
    }

    // Add members to batch
    const membersToAdd = userIds.map((userId: string) => ({
      batch_id: batchId,
      user_id: userId,
    }))

    const { data, error: insertError } = await supabase
      .from("batch_members")
      .insert(membersToAdd)
      .select()

    if (insertError) {
      console.error("Error adding batch members:", insertError)
      return NextResponse.json({ error: "Failed to add members to batch" }, { status: 500 })
    }

    return NextResponse.json({ success: true, members: data })
  } catch (error: any) {
    console.error("Error in add batch members API:", error)
    return NextResponse.json({ error: error.message || "Failed to add members" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await request.json()
    const batchId = params.id

    // Remove member from batch
    const { error: deleteError } = await supabase
      .from("batch_members")
      .delete()
      .eq("batch_id", batchId)
      .eq("user_id", userId)

    if (deleteError) {
      console.error("Error removing batch member:", deleteError)
      return NextResponse.json({ error: "Failed to remove member from batch" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in remove batch member API:", error)
    return NextResponse.json({ error: error.message || "Failed to remove member" }, { status: 500 })
  }
}
