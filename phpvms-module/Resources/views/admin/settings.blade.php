@extends('admin.layouts.app')

@section('title', 'SkyNet ACARS Settings')

@section('content')
<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">SkyNet ACARS Settings</h3>
                </div>
                <div class="card-body">
                    @if(session('success'))
                        <div class="alert alert-success">
                            {{ session('success') }}
                        </div>
                    @endif

                    <form method="POST" action="{{ route('admin.skynet-acars.settings.save') }}">
                        @csrf

                        <div class="form-group">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="enabled" name="enabled" value="1" 
                                    {{ config('skynet-acars.enabled') ? 'checked' : '' }}>
                                <label class="form-check-label" for="enabled">
                                    Enable SkyNet ACARS Module
                                </label>
                            </div>
                        </div>

                        <hr>

                        <h5>ACARS Configuration</h5>

                        <div class="form-group">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="auto_submit_pirep" 
                                    name="acars[auto_submit_pirep]" value="1"
                                    {{ config('skynet-acars.acars.auto_submit_pirep') ? 'checked' : '' }}>
                                <label class="form-check-label" for="auto_submit_pirep">
                                    Automatically submit PIREP when flight ends
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="require_bid" 
                                    name="acars[require_bid]" value="1"
                                    {{ config('skynet-acars.acars.require_bid') ? 'checked' : '' }}>
                                <label class="form-check-label" for="require_bid">
                                    Require active bid before starting flight
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="min_flight_time">Minimum Flight Time (minutes)</label>
                            <input type="number" class="form-control" id="min_flight_time" 
                                name="acars[min_flight_time]" 
                                value="{{ config('skynet-acars.acars.min_flight_time', 5) }}" min="0">
                        </div>

                        <div class="form-group">
                            <label for="position_update_interval">Position Update Interval (seconds)</label>
                            <input type="number" class="form-control" id="position_update_interval" 
                                name="acars[position_update_interval]" 
                                value="{{ config('skynet-acars.acars.position_update_interval', 30) }}" min="1">
                        </div>

                        <hr>

                        <h5>API Configuration</h5>

                        <div class="form-group">
                            <label for="rate_limit">Rate Limit (requests per minute)</label>
                            <input type="number" class="form-control" id="rate_limit" 
                                name="api[rate_limit]" 
                                value="{{ config('skynet-acars.api.rate_limit', 60) }}" min="1">
                        </div>

                        <div class="form-group">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="require_authentication" 
                                    name="api[require_authentication]" value="1"
                                    {{ config('skynet-acars.api.require_authentication') ? 'checked' : '' }}>
                                <label class="form-check-label" for="require_authentication">
                                    Require authentication for API endpoints
                                </label>
                            </div>
                        </div>

                        <hr>

                        <h5>PIREP Configuration</h5>

                        <div class="form-group">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="auto_approve" 
                                    name="pirep[auto_approve]" value="1"
                                    {{ config('skynet-acars.pirep.auto_approve') ? 'checked' : '' }}>
                                <label class="form-check-label" for="auto_approve">
                                    Automatically approve PIREPs
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="default_status">Default PIREP Status</label>
                            <select class="form-control" id="default_status" name="pirep[default_status]">
                                <option value="PENDING" {{ config('skynet-acars.pirep.default_status') === 'PENDING' ? 'selected' : '' }}>Pending</option>
                                <option value="APPROVED" {{ config('skynet-acars.pirep.default_status') === 'APPROVED' ? 'selected' : '' }}>Approved</option>
                                <option value="REJECTED" {{ config('skynet-acars.pirep.default_status') === 'REJECTED' ? 'selected' : '' }}>Rejected</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <div class="form-check">
                                <input type="checkbox" class="form-check-input" id="calculate_score" 
                                    name="pirep[calculate_score]" value="1"
                                    {{ config('skynet-acars.pirep.calculate_score') ? 'checked' : '' }}>
                                <label class="form-check-label" for="calculate_score">
                                    Calculate flight score automatically
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
