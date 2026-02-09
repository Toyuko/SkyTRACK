@extends('admin.layouts.app')

@section('title', 'ACARS Flight Details')

@section('content')
<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Flight Details - {{ $flight->callsign }}</h3>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h5>Flight Information</h5>
                            <table class="table table-sm">
                                <tr>
                                    <th>User:</th>
                                    <td>{{ $flight->user->name ?? 'N/A' }}</td>
                                </tr>
                                <tr>
                                    <th>Callsign:</th>
                                    <td>{{ $flight->callsign }}</td>
                                </tr>
                                <tr>
                                    <th>Route:</th>
                                    <td>{{ $flight->departure_icao }} → {{ $flight->arrival_icao }}</td>
                                </tr>
                                <tr>
                                    <th>Aircraft:</th>
                                    <td>{{ $flight->aircraft_icao }}</td>
                                </tr>
                                <tr>
                                    <th>Simulator:</th>
                                    <td>{{ $flight->simulator }}</td>
                                </tr>
                                <tr>
                                    <th>Status:</th>
                                    <td>
                                        @if($flight->status === 'active')
                                            <span class="badge badge-success">Active</span>
                                        @elseif($flight->status === 'completed')
                                            <span class="badge badge-info">Completed</span>
                                        @else
                                            <span class="badge badge-danger">Cancelled</span>
                                        @endif
                                    </td>
                                </tr>
                                <tr>
                                    <th>Started:</th>
                                    <td>{{ $flight->started_at ? $flight->started_at->format('Y-m-d H:i:s') : 'N/A' }}</td>
                                </tr>
                                <tr>
                                    <th>Ended:</th>
                                    <td>{{ $flight->ended_at ? $flight->ended_at->format('Y-m-d H:i:s') : 'N/A' }}</td>
                                </tr>
                                <tr>
                                    <th>Flight Time:</th>
                                    <td>{{ $flight->flight_time }} minutes</td>
                                </tr>
                                <tr>
                                    <th>Distance:</th>
                                    <td>{{ $flight->distance }} NM</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <hr>

                    <h5>Position Updates ({{ $flight->positions->count() }})</h5>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Position</th>
                                    <th>Altitude</th>
                                    <th>Speed</th>
                                    <th>Heading</th>
                                    <th>Phase</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($flight->positions->take(50) as $position)
                                    <tr>
                                        <td>{{ $position->acars_timestamp->format('H:i:s') }}</td>
                                        <td>{{ number_format($position->latitude, 4) }}, {{ number_format($position->longitude, 4) }}</td>
                                        <td>{{ number_format($position->altitude) }} ft</td>
                                        <td>{{ $position->ground_speed }} kts</td>
                                        <td>{{ $position->heading }}°</td>
                                        <td>{{ $position->flight_phase }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>

                    @if($flight->positions->count() > 50)
                        <p class="text-muted">Showing first 50 positions of {{ $flight->positions->count() }} total</p>
                    @endif
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
