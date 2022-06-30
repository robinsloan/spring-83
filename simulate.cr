struct Peer
  property data
  property already_shared
  property num_inbound
  property evil

  def initialize(
    @data : Int32,
    @already_shared : Bool,
    @num_inbound : Int32,
    @evil : Bool
  )
  end
end

module Sim
  extend self
  DESIRED_DATA =   99
  NUM_PEERS    = 1000
  NUM_SAMPLED  =    5

  PROPORTION_EVIL = 0.1

  @@peers = Array(Peer).new

  def convergence_ratio
    num_with_data = 0
    @@peers.each do |peer|
      if peer.data == DESIRED_DATA
        num_with_data += 1
      end
    end

    return (num_with_data.to_f / NUM_PEERS.to_f).significant(2)
  end

  def propagate
    bandwidth = 0
    wasted = 0
    new_peers = @@peers.dup

    NUM_PEERS.times do |index|
      peer = @@peers[index]

      if peer.data == DESIRED_DATA && !peer.already_shared && !peer.evil
        # Share with sampled peers
        NUM_SAMPLED.times do
          r_index = (Random.rand * NUM_PEERS).to_i
          bandwidth += 1
          if @@peers[r_index].data == DESIRED_DATA
            wasted += 1

            new_peers[r_index] = Peer.new(
              @@peers[r_index].data,
              @@peers[r_index].already_shared,
              @@peers[r_index].num_inbound + 1,
              @@peers[r_index].evil
            )
          else
            new_num_inbound = @@peers[r_index].num_inbound + 1
            new_peers[r_index] = Peer.new(
              DESIRED_DATA,
              @@peers[r_index].already_shared,
              new_num_inbound,
              @@peers[r_index].evil
            )
          end
        end

        # Mark that I shared with sampled peers
        new_peers[index] = Peer.new(DESIRED_DATA, true, peer.num_inbound, peer.evil)
      end
    end

    @@peers = new_peers
    return {bandwidth, wasted}
  end

  def run
    avg_steps = 0
    avg_bandwidth = 0
    avg_inbound_per_peer = 0
    avg_wasted = 0
    did_not_converge = 0

    max_inbound_per_peer = 0

    50.times do |n|
      puts "---"
      puts "Run #{n}"

      @@peers = Array(Peer).new

      NUM_PEERS.times do |i|
        evil = Random.rand < PROPORTION_EVIL ? true : false
        new_peer = Peer.new(0, false, 0, evil)
        @@peers.push(new_peer)
      end

      @@peers[0] = Peer.new(DESIRED_DATA, false, 0, false)

      steps = 0
      bandwidth = 0
      wasted = 0

      while steps < 100
        added_bandwidth, added_wasted = propagate
        bandwidth += added_bandwidth
        wasted += added_wasted
        convergence = convergence_ratio
        puts "Step #{steps}: #{convergence}"
        if convergence >= 1.0
          break
        end
        steps += 1
      end

      if steps >= 100
        did_not_converge += 1
      end

      inbound_per_peer = 0

      @@peers.each do |peer|
        inbound_per_peer += peer.num_inbound
        if (peer.num_inbound > max_inbound_per_peer)
          max_inbound_per_peer = peer.num_inbound
        end
      end

      inbound_per_peer /= @@peers.size

      if (avg_inbound_per_peer == 0)
        avg_inbound_per_peer = inbound_per_peer
      else
        avg_inbound_per_peer = (avg_inbound_per_peer + inbound_per_peer) / 2.0
      end

      if (avg_steps == 0)
        avg_steps = steps
      else
        avg_steps = (avg_steps + steps) / 2.0
      end

      if (avg_bandwidth == 0)
        avg_bandwidth = bandwidth
      else
        avg_bandwidth = (avg_bandwidth + bandwidth) / 2.0
      end

      if (avg_wasted == 0)
        avg_wasted = wasted
      else
        avg_wasted = (avg_wasted + wasted) / 2.0
      end
    end

    puts "Num did not converge: #{did_not_converge}"
    puts "Avg inbound reqs per peer: #{avg_inbound_per_peer}"
    puts "Max inbound reqs for any peer, in any run: #{max_inbound_per_peer}"
    puts "Avg time steps: #{avg_steps}"
    puts "Avg bandwidth: #{avg_bandwidth}"
    puts "Avg wasted bandwidth: #{avg_wasted}"
    puts "which is multiplier of #{(avg_bandwidth / NUM_PEERS).significant(1)}X direct"
  end
end

Sim.run
